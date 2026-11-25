import { Router, type IRouter, type RequestHandler } from "express";
import {
  CallNextCustomerParams,
  CallNextCustomerResponse,
  CompleteServiceParams,
  CompleteServiceResponse,
  CreateBusinessBody,
  CreateBusinessResponse,
  GetCustomerTicketHeader,
  GetCustomerTicketParams,
  GetCustomerTicketResponse,
  GetManagementDashboardParams,
  GetManagementDashboardResponse,
  GetPublicBusinessParams,
  GetPublicBusinessResponse,
  GetQueueDisplayParams,
  GetQueueDisplayResponse,
  JoinQueueBody,
  JoinQueueParams,
  JoinQueueResponse,
  LoginBusinessBody,
  LoginBusinessParams,
  LoginBusinessResponse,
  LogoutBusinessParams,
  LogoutBusinessResponse,
  Message,
  RecallCurrentCustomerParams,
  RecallCurrentCustomerResponse,
  SkipTicketParams,
  SkipTicketResponse,
  StartServiceParams,
  StartServiceResponse,
  UpdateBusinessBody,
  UpdateBusinessParams,
  UpdateBusinessResponse,
  UpdateQueueStateBody,
  UpdateQueueStateParams,
  UpdateQueueStateResponse,
} from "@workspace/api-zod";
import {
  callNextCustomer,
  createBusiness,
  getBusinessBySlug,
  getBusinessView,
  getCustomerTicket,
  getManagementDashboard,
  getPublicBusiness,
  getQueueDisplay,
  joinQueue,
  QueueUpError,
  recallCurrentCustomer,
  updateBusinessSettings,
  updateQueueState,
  updateTicketStatus,
  verifyAccessCode,
} from "../lib/queueup";
import {
  assertOwnerSessionConfiguration,
  clearOwnerSession,
  hasOwnerSession,
  setOwnerSession,
} from "../lib/queueup-auth";

const router: IRouter = Router();

type LoginAttempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, LoginAttempt>();
const attemptLimit = 5;
const attemptWindowMs = 15 * 60 * 1000;

const handleErrors = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((error: unknown) => {
      if (error instanceof QueueUpError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      req.log.error({ err: error }, "QueueUp request failed");
      res.status(500).json({ error: "Something went wrong" });
    });
  };

function validationError(message: string) {
  return { error: message };
}

async function authorizedBusiness(
  slug: string,
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
) {
  const business = await getBusinessBySlug(slug);
  if (!business) {
    response.status(404).json(validationError("Business not found"));
    return null;
  }
  if (!hasOwnerSession(request, business.id)) {
    response.status(401).json(validationError("Owner sign-in is required"));
    return null;
  }
  return business;
}

router.post(
  "/businesses",
  handleErrors(async (req, res): Promise<void> => {
    const parsed = CreateBusinessBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error.message));
      return;
    }
    assertOwnerSessionConfiguration();
    const business = await createBusiness(parsed.data);
    setOwnerSession(res, business.slug, business.id);
    const payload = {
      business: await getBusinessView(business.slug),
      bookingPath: `/q/${business.slug}`,
      managePath: `/manage/${business.slug}`,
      displayPath: `/display/${business.slug}`,
    };
    res.status(201).json(CreateBusinessResponse.parse(payload));
  }),
);

router.get(
  "/businesses/:slug/public",
  handleErrors(async (req, res): Promise<void> => {
    const params = GetPublicBusinessParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    res.json(
      GetPublicBusinessResponse.parse(
        await getPublicBusiness(params.data.slug),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/tickets",
  handleErrors(async (req, res): Promise<void> => {
    const params = JoinQueueParams.safeParse(req.params);
    const body = JoinQueueBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json(
          validationError(
            body.success
              ? (params.error?.message ?? "Invalid request")
              : (body.error?.message ?? "Invalid request"),
          ),
        );
      return;
    }
    res
      .status(201)
      .json(
        JoinQueueResponse.parse(
          await joinQueue(params.data.slug, body.data),
        ),
      );
  }),
);

router.get(
  "/businesses/:slug/tickets/:ticketId",
  handleErrors(async (req, res): Promise<void> => {
    const params = GetCustomerTicketParams.safeParse(req.params);
    const header = GetCustomerTicketHeader.safeParse({
      "X-Ticket-Token": req.get("X-Ticket-Token"),
    });
    if (!params.success || !header.success) {
      res
        .status(400)
        .json(
          validationError(
            header.success
              ? (params.error?.message ?? "Invalid request")
              : (header.error?.message ?? "Invalid request"),
          ),
        );
      return;
    }
    res.json(
      GetCustomerTicketResponse.parse(
        await getCustomerTicket(
          params.data.slug,
          params.data.ticketId,
          header.data["X-Ticket-Token"],
        ),
      ),
    );
  }),
);

router.get(
  "/businesses/:slug/display",
  handleErrors(async (req, res): Promise<void> => {
    const params = GetQueueDisplayParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    res.json(
      GetQueueDisplayResponse.parse(await getQueueDisplay(params.data.slug)),
    );
  }),
);

router.post(
  "/businesses/:slug/auth",
  handleErrors(async (req, res): Promise<void> => {
    const params = LoginBusinessParams.safeParse(req.params);
    const body = LoginBusinessBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json(
          validationError(
            body.success
              ? (params.error?.message ?? "Invalid request")
              : (body.error?.message ?? "Invalid request"),
          ),
        );
      return;
    }

    const business = await getBusinessBySlug(params.data.slug);
    if (!business) {
      res.status(404).json(validationError("Business not found"));
      return;
    }
    assertOwnerSessionConfiguration();
    const key = `${params.data.slug}:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const previous = loginAttempts.get(key);
    const attempt =
      !previous || previous.resetAt <= now
        ? { count: 0, resetAt: now + attemptWindowMs }
        : previous;
    if (attempt.count >= attemptLimit) {
      res
        .status(429)
        .json(validationError("Too many sign-in attempts. Try again later."));
      return;
    }

    const valid = await verifyAccessCode(
      body.data.accessCode,
      business.adminAccessCodeHash,
    );
    if (!valid) {
      loginAttempts.set(key, {
        count: attempt.count + 1,
        resetAt: attempt.resetAt,
      });
      res.status(401).json(validationError("The access code is incorrect"));
      return;
    }

    loginAttempts.delete(key);
    setOwnerSession(res, business.slug, business.id);
    res.json(
      LoginBusinessResponse.parse(
        await getManagementDashboard(business.slug),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/auth/logout",
  handleErrors(async (req, res): Promise<void> => {
    const params = LogoutBusinessParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    clearOwnerSession(res, params.data.slug);
    res.json(LogoutBusinessResponse.parse({ message: "Signed out" }));
  }),
);

router.get(
  "/businesses/:slug/manage",
  handleErrors(async (req, res): Promise<void> => {
    const params = GetManagementDashboardParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      GetManagementDashboardResponse.parse(
        await getManagementDashboard(params.data.slug),
      ),
    );
  }),
);

router.patch(
  "/businesses/:slug/manage",
  handleErrors(async (req, res): Promise<void> => {
    const params = UpdateBusinessParams.safeParse(req.params);
    const body = UpdateBusinessBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json(
          validationError(
            body.success
              ? (params.error?.message ?? "Invalid request")
              : (body.error?.message ?? "Invalid request"),
          ),
        );
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      UpdateBusinessResponse.parse(
        await updateBusinessSettings(params.data.slug, body.data),
      ),
    );
  }),
);

router.patch(
  "/businesses/:slug/queue",
  handleErrors(async (req, res): Promise<void> => {
    const params = UpdateQueueStateParams.safeParse(req.params);
    const body = UpdateQueueStateBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json(
          validationError(
            body.success
              ? (params.error?.message ?? "Invalid request")
              : (body.error?.message ?? "Invalid request"),
          ),
        );
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      UpdateQueueStateResponse.parse(
        await updateQueueState(params.data.slug, body.data.isPaused),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/queue/call-next",
  handleErrors(async (req, res): Promise<void> => {
    const params = CallNextCustomerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      CallNextCustomerResponse.parse(
        await callNextCustomer(params.data.slug),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/queue/recall",
  handleErrors(async (req, res): Promise<void> => {
    const params = RecallCurrentCustomerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      RecallCurrentCustomerResponse.parse(
        await recallCurrentCustomer(params.data.slug),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/tickets/:ticketId/start",
  handleErrors(async (req, res): Promise<void> => {
    const params = StartServiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      StartServiceResponse.parse(
        await updateTicketStatus(
          params.data.slug,
          params.data.ticketId,
          "start",
        ),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/tickets/:ticketId/complete",
  handleErrors(async (req, res): Promise<void> => {
    const params = CompleteServiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      CompleteServiceResponse.parse(
        await updateTicketStatus(
          params.data.slug,
          params.data.ticketId,
          "complete",
        ),
      ),
    );
  }),
);

router.post(
  "/businesses/:slug/tickets/:ticketId/skip",
  handleErrors(async (req, res): Promise<void> => {
    const params = SkipTicketParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(validationError(params.error.message));
      return;
    }
    if (!(await authorizedBusiness(params.data.slug, req, res))) return;
    res.json(
      SkipTicketResponse.parse(
        await updateTicketStatus(
          params.data.slug,
          params.data.ticketId,
          "skip",
        ),
      ),
    );
  }),
);

export default router;
