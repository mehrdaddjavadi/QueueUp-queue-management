import { type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowRight, BellRing, Check,
  CheckCircle2, ChevronRight, Clock3, ExternalLink, LockKeyhole,
  LogOut, Monitor, Pause, Play, RefreshCw, Scissors, Settings2,
  ShieldCheck, SkipForward, Sparkles, Ticket, Users, X,
} from 'lucide-react';
import {
  BusinessCategory,
  type CustomerTicket,
  type ManagementDashboard,
  getGetCustomerTicketQueryKey,
  getGetManagementDashboardQueryKey,
  getGetPublicBusinessQueryKey,
  getGetQueueDisplayQueryKey,
  useCallNextCustomer,
  useCompleteService,
  useCreateBusiness,
  useGetCustomerTicket,
  useGetManagementDashboard,
  useGetPublicBusiness,
  useGetQueueDisplay,
  useJoinQueue,
  useLoginBusiness,
  useLogoutBusiness,
  useRecallCurrentCustomer,
  useSkipTicket,
  useStartService,
  useUpdateBusiness,
  useUpdateQueueState,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

const categoryOptions = Object.values(BusinessCategory);
const ticketStoreKey = (slug: string) => `queueup:ticket:${slug}`;
const clientTokenKey = 'queueup:client-token';

function getClientToken() {
  let token = localStorage.getItem(clientTokenKey);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(clientTokenKey, token);
  }
  return token;
}

function errorText(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    try {
      const parsed = JSON.parse(error.message) as { error?: string; message?: string };
      return parsed.error || parsed.message || error.message;
    } catch {
      return error.message;
    }
  }
  return fallback;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-inherit no-underline" data-testid="link-home-brand">
      <span className="grid size-9 place-items-center rounded-xl bg-[#4c5dd4] text-white shadow-sm">
        <Activity size={19} strokeWidth={2.4} />
      </span>
      {!compact && <span className="wordmark text-[19px] leading-none tracking-[-.07em]">queueup</span>}
    </Link>
  );
}

function Button({
  children, variant = 'primary', className = '', type = 'button', disabled, onClick, testId,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  className?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; testId?: string;
}) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`btn btn-${variant} ${className}`}>{children}</button>;
}

function Field({
  label, hint, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="block space-y-2">
    <span className="flex items-center justify-between text-[13px] font-semibold text-[#303a50]">
      {label}{hint && <span className="text-[11px] font-normal text-[#7a8496]">{hint}</span>}
    </span>
    <input {...props} className={`field ${props.className || ''}`} />
  </label>;
}

function SelectField({
  label, children, ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="block space-y-2">
    <span className="block text-[13px] font-semibold text-[#303a50]">{label}</span>
    <select {...props} className={`field ${props.className || ''}`}>{children}</select>
  </label>;
}

function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#f0d1ce] bg-[#fff7f6] p-4 text-sm text-[#914b44]" data-testid="status-error">
    <X size={17} className="mt-0.5 shrink-0" />
    <div className="flex-1"><p className="font-semibold">We couldn't complete that</p><p className="mt-1 leading-relaxed">{message}</p></div>
    {onRetry && <button onClick={onRetry} className="font-semibold underline underline-offset-4" data-testid="button-retry">Retry</button>}
  </div>;
}

function PageLoader({ label = 'Loading your queue' }: { label?: string }) {
  return <main className="app-shell grid place-items-center p-6" aria-label={label}>
    <div className="w-full max-w-sm space-y-4">
      <div className="h-3 w-28 animate-pulse rounded bg-[#e5e9f1]" />
      <div className="h-28 animate-pulse rounded-2xl bg-[#e5e9f1]" />
      <div className="h-14 animate-pulse rounded-xl bg-[#e5e9f1]" />
      <p className="eyebrow text-center">{label}</p>
    </div>
  </main>;
}

function Landing() {
  return <div className="app-shell overflow-hidden">
    <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
      <Brand />
      <nav className="flex items-center gap-2">
        <a href="#how-it-works" className="hidden rounded-lg px-3 py-2.5 text-[13px] font-semibold text-[#626d82] transition hover:bg-white lg:block" data-testid="link-how-it-works">How it works</a>
        <a href="#features" className="hidden rounded-lg px-3 py-2.5 text-[13px] font-semibold text-[#626d82] transition hover:bg-white lg:block" data-testid="link-features">Features</a>
        <Link href="/manage" className="hidden rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#626d82] transition hover:bg-white sm:block" data-testid="link-manage-queue">Manage queue</Link>
        <Link href="/create" className="hidden rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#626d82] transition hover:bg-white sm:block" data-testid="link-create-queue">For businesses</Link>
        <Link href="/create" className="btn btn-primary !min-h-[40px] !px-4" data-testid="link-get-started">Create a queue <ArrowRight size={15} /></Link>
      </nav>
    </header>
    <main>
      <section className="soft-grid relative mx-auto max-w-[1180px] px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_.96fr]">
          <div className="fade-up relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce1ef] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#5a6680]">
              <span className="size-1.5 rounded-full bg-[#4c5dd4]" /> A calmer way to run the line
            </div>
            <h1 className="max-w-[650px] font-['Manrope'] text-[clamp(42px,7vw,76px)] font-extrabold leading-[1.04] tracking-[-.075em] text-[#202a40]">
              Good service.<br /><span className="text-[#4c5dd4]">No waiting room.</span>
            </h1>
            <p className="mt-6 max-w-[460px] text-[16px] leading-7 text-[#667187]">
              Let customers take a number from anywhere. Keep your team focused on the person in front of you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/create" className="btn btn-primary !min-h-[48px] !px-5" data-testid="link-start-free">Set up your queue <ArrowRight size={16} /></Link>
              <span className="text-xs text-[#7d8798]">No customer accounts. No hardware to buy.</span>
            </div>
            <div className="mt-10 flex items-center gap-5 border-t border-[#e1e5ed] pt-5 text-[11px] font-medium text-[#758096]">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[#6171db]" /> Private by design</span>
              <span className="inline-flex items-center gap-2"><RefreshCw size={14} className="text-[#6171db]" /> Live updates</span>
            </div>
          </div>
          <div className="fade-up-2 relative mx-auto w-full max-w-[490px]">
            <div className="absolute -right-7 -top-7 size-36 rounded-full bg-[#e5e9ff] blur-3xl" />
            <div className="absolute -bottom-8 -left-9 size-32 rounded-full bg-[#dfeefa] blur-3xl" />
            <div className="surface relative rotate-[1.5deg] overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#edf0f5] pb-4">
                <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[#eef0ff] text-[#4c5dd4]"><Scissors size={17} /></span><div><p className="text-sm font-bold text-[#29334a]">Queue preview</p><p className="text-[11px] text-[#8992a3]">Illustrative example</p></div></div>
                <span className="status-pill status-serving"><span className="dot" />SAMPLE</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                <div className="rounded-xl bg-[#f5f6fa] p-4"><p className="eyebrow">Now serving</p><p className="mono mt-2 text-[35px] font-medium tracking-[-.07em] text-[#26324b]">A–08</p></div>
                <div className="rounded-xl bg-[#f5f6fa] p-4"><p className="eyebrow">In line</p><p className="mono mt-2 text-[35px] font-medium tracking-[-.07em] text-[#26324b]">04</p></div>
              </div>
              <div className="rounded-xl border border-[#e8ebf2] bg-white p-4">
                <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-[#7b8496]">UP NEXT</p><p className="mt-1 text-sm font-bold text-[#2d374d]">Ticket A–09</p></div><span className="mono rounded-lg bg-[#edf0ff] px-2.5 py-1.5 text-sm font-medium text-[#4c5dd4]">~12 min</span></div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full w-[67%] rounded-full bg-[#6272dd]" /></div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#4c5dd4] px-4 py-3.5 text-white">
                <div><p className="text-xs font-semibold">Ready for the next customer?</p><p className="mt-0.5 text-[10px] text-white/70">One tap keeps everyone moving.</p></div><ArrowRight size={18} />
              </div>
              <div className="mt-4 flex justify-center gap-1.5"><span className="size-1.5 rounded-full bg-[#4c5dd4]" /><span className="size-1.5 rounded-full bg-[#d4d9e5]" /><span className="size-1.5 rounded-full bg-[#d4d9e5]" /></div>
            </div>
            <div className="absolute -bottom-7 -left-7 rounded-xl border border-[#dfe3ed] bg-white px-4 py-3 shadow-[0_10px_32px_rgba(40,54,92,.1)]">
              <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[#e8f5ef] text-[#398168]"><Check size={16} /></span><div><p className="text-[11px] font-bold text-[#303a50]">Your turn is coming up</p><p className="text-[10px] text-[#828b9a]">Ticket A–09 · about 12 min</p></div></div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-[1180px] scroll-mt-8 px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 border-y border-[#e0e5ed] py-9 md:grid-cols-[.7fr_1.3fr]">
          <div><p className="eyebrow">Made for the everyday rush</p><h2 className="mt-3 max-w-sm font-['Manrope'] text-3xl font-bold tracking-[-.06em] text-[#252f46]">The line moves.<br />Your day stays yours.</h2></div>
          <div className="grid gap-8 sm:grid-cols-3">
            <Feature icon={<Ticket size={18} />} title="A ticket, not an account" text="Customers join in seconds with a name and a link. Nothing to install." />
            <Feature icon={<BellRing size={18} />} title="Know when it's close" text="A live ticket page shows their place and a practical wait estimate." />
            <Feature icon={<Monitor size={18} />} title="One clear display" text="Put the current number on a screen. Names stay private, always." />
          </div>
        </div>
      </section>
      <section id="how-it-works" className="mx-auto max-w-[1180px] scroll-mt-8 px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mb-7 max-w-xl"><p className="eyebrow">HOW IT WORKS</p><h2 className="mt-3 font-['Manrope'] text-3xl font-bold tracking-[-.06em] text-[#252f46]">Four steps. A much shorter wait.</h2><p className="mt-3 text-sm leading-6 text-[#737e91]">Set up your service once, then let every customer follow the same clear process.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard number="01" title="Create your queue" text="Choose your business type, service pace, capacity, and owner access code." />
          <StepCard number="02" title="Share your link" text="Put the booking link on your site, social page, or at the front desk." />
          <StepCard number="03" title="Customers join" text="Customers enter a name and receive a private ticket from any browser." />
          <StepCard number="04" title="Serve and update" text="Call the next ticket, manage service, and keep your display current." />
        </div>
      </section>
      <section className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="surface grid gap-8 p-6 sm:p-8 md:grid-cols-[.7fr_1.3fr]">
          <div><p className="eyebrow">MADE FOR SERVICE BUSINESSES</p><h2 className="mt-3 font-['Manrope'] text-2xl font-bold tracking-[-.055em] text-[#252f46]">A calmer way to welcome people.</h2></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {['Barbershops', 'Medical clinics', 'Beauty salons', 'Restaurants', 'Car washes', 'Repair shops'].map((businessType) => <div key={businessType} className="rounded-xl bg-[#f5f6fa] px-3 py-3 text-xs font-semibold text-[#4b5870]">{businessType}</div>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1180px] scroll-mt-8 px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="mb-7 max-w-xl"><p className="eyebrow">QUEUEUP FEATURES</p><h2 className="mt-3 font-['Manrope'] text-3xl font-bold tracking-[-.06em] text-[#252f46]">The useful details, handled.</h2></div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Ticket size={18} />} title="Online ticket generation" text="Give each customer a numbered place without an account or app." />
          <Feature icon={<RefreshCw size={18} />} title="Live queue tracking" text="Ticket positions and current service status refresh automatically." />
          <Feature icon={<Activity size={18} />} title="Smart wait estimates" text="Use service duration and current progress to estimate the wait." />
          <Feature icon={<Users size={18} />} title="Business dashboard" text="Call, serve, complete, skip, and recall tickets in one place." />
          <Feature icon={<Pause size={18} />} title="Flexible queue controls" text="Pause new bookings while continuing to serve existing customers." />
          <Feature icon={<Monitor size={18} />} title="Public display screen" text="Show current and upcoming ticket numbers without customer names." />
        </div>
      </section>
      <section className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[24px] bg-[#222d48] p-7 text-white sm:p-12">
          <div className="absolute -right-12 -top-24 size-72 rounded-full border border-white/10" /><div className="absolute -right-3 -top-16 size-56 rounded-full border border-white/10" />
          <div className="relative flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
            <div><p className="eyebrow !text-[#aeb9e8]">Start small. Stay in control.</p><h2 className="mt-3 max-w-xl font-['Manrope'] text-[clamp(28px,5vw,46px)] font-bold leading-tight tracking-[-.06em]">Your queue, ready before the next customer walks in.</h2></div>
            <Link href="/create" className="btn !min-h-[46px] !shrink-0 bg-white !text-[#303c5c]" data-testid="link-create-bottom">Create your queue <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </main>
    <footer className="mx-auto flex max-w-[1180px] items-center justify-between border-t border-[#e0e5ed] px-5 py-6 text-[11px] text-[#7d8798] sm:px-8"><Brand compact /><span>QueueUp · A little more room in your day.</span></footer>
  </div>;
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div><span className="grid size-9 place-items-center rounded-xl bg-[#edf0ff] text-[#5364d3]">{icon}</span><h3 className="mt-4 text-sm font-bold text-[#2d374d]">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[#737e91]">{text}</p></div>;
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="surface p-5"><span className="mono text-[11px] text-[#5869d7]">{number}</span><h3 className="mt-4 text-sm font-bold text-[#303a50]">{title}</h3><p className="mt-2 text-xs leading-5 text-[#737e91]">{text}</p></div>;
}

function CreateBusiness() {
  const create = useCreateBusiness();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', category: BusinessCategory.Barbershop, averageServiceMinutes: '20', maxActiveCapacity: '35', accessCode: '', confirmAccessCode: '' });
  const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.accessCode !== form.confirmAccessCode) {
      setError('The access codes do not match.');
      return;
    }
    create.mutate({ data: { name: form.name, category: form.category, averageServiceMinutes: Number(form.averageServiceMinutes), maxActiveCapacity: Number(form.maxActiveCapacity), accessCode: form.accessCode } }, {
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: getGetManagementDashboardQueryKey(created.business.slug) });
        setLocation(`/manage/${created.business.slug}?created=1`);
      },
      onError: (err) => setError(errorText(err)),
    });
  };
  return <div className="app-shell">
    <header className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 sm:px-8"><Brand /><Link href="/" className="text-xs font-semibold text-[#677287] hover:text-[#303a50]" data-testid="link-back-home">Back to QueueUp</Link></header>
    <main className="mx-auto grid max-w-[1100px] gap-12 px-5 pb-14 pt-5 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:gap-20 md:pt-14">
      <div className="fade-up">
        <p className="eyebrow">For the people keeping things moving</p>
        <h1 className="mt-4 max-w-md font-['Manrope'] text-[42px] font-extrabold leading-[1.08] tracking-[-.07em] text-[#202a40] sm:text-[52px]">A better line starts here.</h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-[#6e788b]">Set up the queue once. Then focus on your customers while QueueUp handles the numbers.</p>
        <div className="mt-9 space-y-4">
          <Step number="01" title="Choose your pace" text="Set a useful service-time estimate and queue limit." />
          <Step number="02" title="Share one simple link" text="Customers reserve a spot without making an account." />
          <Step number="03" title="Run your day" text="Call tickets and show a live number on any screen." />
        </div>
        <div className="mt-10 flex items-center gap-2 text-[11px] text-[#8790a0]"><LockKeyhole size={14} /> Your access code is never saved in this browser.</div>
      </div>
      <form onSubmit={submit} className="surface fade-up-2 mx-auto w-full max-w-[560px] p-5 sm:p-8">
        <div className="mb-7"><span className="status-pill status-waiting">BUSINESS SETUP</span><h2 className="mt-4 text-xl font-bold tracking-[-.04em] text-[#27324a]">Create your queue</h2><p className="mt-1.5 text-xs text-[#788397]">A few details now. You can adjust them later.</p></div>
        <div className="space-y-5">
          <Field label="Business name" placeholder="e.g. Northside Studio" value={form.name} onChange={(e) => update('name', e.target.value)} minLength={2} maxLength={100} required autoComplete="organization" data-testid="input-business-name" />
          <SelectField label="What kind of business?" value={form.category} onChange={(e) => update('category', e.target.value)} data-testid="select-business-category">
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minutes per customer" type="number" min={1} max={240} value={form.averageServiceMinutes} onChange={(e) => update('averageServiceMinutes', e.target.value)} required data-testid="input-service-minutes" />
            <Field label="Queue capacity" hint="people" type="number" min={1} max={500} value={form.maxActiveCapacity} onChange={(e) => update('maxActiveCapacity', e.target.value)} required data-testid="input-queue-capacity" />
          </div>
          <div className="rounded-xl bg-[#f5f6fa] p-4">
            <Field label="Owner access code" hint="6–128 characters" type="password" minLength={6} maxLength={128} autoComplete="new-password" placeholder="Choose a private access code" value={form.accessCode} onChange={(e) => update('accessCode', e.target.value)} required data-testid="input-access-code" />
            <div className="mt-4"><Field label="Confirm access code" type="password" minLength={6} maxLength={128} autoComplete="new-password" placeholder="Enter the same code again" value={form.confirmAccessCode} onChange={(e) => update('confirmAccessCode', e.target.value)} required data-testid="input-confirm-access-code" /></div>
            <p className="mt-2 text-[10px] leading-4 text-[#828b9b]">You'll use this to sign in to your owner dashboard. Keep it somewhere safe.</p>
          </div>
          {error && <InlineError message={error} />}
          <Button type="submit" disabled={create.isPending} className="w-full !min-h-[48px]" testId="button-create-business">{create.isPending ? 'Setting up your queue…' : <>Create queue <ArrowRight size={16} /></>}</Button>
        </div>
        <p className="mt-4 text-center text-[10px] leading-4 text-[#8992a1]">By continuing, you create an owner-managed public queue page and a privacy-safe display.</p>
      </form>
    </main>
  </div>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className="mono pt-0.5 text-[11px] text-[#6474da]">{number}</span><div><p className="text-xs font-bold text-[#354058]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#7c8698]">{text}</p></div></div>;
}

function ManageEntry() {
  const [, setLocation] = useLocation();
  const [businessPath, setBusinessPath] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = businessPath.trim().replace(/\/+$/, '');
    const slug = trimmed.split('/').filter(Boolean).at(-1);
    if (!slug || slug === 'manage') {
      setError('Enter the business slug or its owner dashboard link.');
      return;
    }
    setLocation(`/manage/${encodeURIComponent(slug)}`);
  };
  return <div className="app-shell">
    <header className="mx-auto flex max-w-[1040px] items-center justify-between px-5 py-5 sm:px-8"><Brand /><Link href="/" className="text-xs font-semibold text-[#6d788c]" data-testid="link-manage-entry-home">QueueUp home</Link></header>
    <main className="mx-auto grid max-w-[1040px] gap-10 px-5 pb-12 pt-8 sm:px-8 md:grid-cols-[.9fr_1.1fr] md:pt-14">
      <div><p className="eyebrow">OWNER ACCESS</p><h1 className="mt-4 font-['Manrope'] text-[42px] font-extrabold leading-tight tracking-[-.07em] text-[#202a40]">Pick up where your queue is.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-[#737e91]">Enter the business slug or the owner dashboard link you saved when setting up.</p></div>
      <form onSubmit={submit} className="surface mx-auto w-full max-w-[480px] p-6 sm:p-8">
        <Field label="Business slug or dashboard link" placeholder="e.g. northside-studio-a1b2c3d4e5" value={businessPath} onChange={(event) => setBusinessPath(event.target.value)} required data-testid="input-business-slug" />
        {error && <div className="mt-4"><InlineError message={error} /></div>}
        <Button type="submit" className="mt-5 w-full !min-h-[47px]" testId="button-open-owner-dashboard">Continue <ArrowRight size={15} /></Button>
      </form>
    </main>
  </div>;
}

function BookingPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const query = useGetPublicBusiness(slug, { query: { queryKey: getGetPublicBusinessQueryKey(slug), refetchInterval: 3000 } });
  const join = useJoinQueue();
  const queryClient = useQueryClient();
  const savedTicket = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(ticketStoreKey(slug)) || 'null') as { id: string; token: string } | null; } catch { return null; }
  }, [slug]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const ticketQuery = useGetCustomerTicket(slug, savedTicket?.id || '', {
    query: { enabled: Boolean(savedTicket?.id && savedTicket.token), queryKey: getGetCustomerTicketQueryKey(slug, savedTicket?.id || ''), refetchInterval: 3000 },
    request: { headers: { 'X-Ticket-Token': savedTicket?.token || '' } },
  });
  const business = query.data?.business;
  const reserve = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError('');
    join.mutate({ slug, data: { customerName: name.trim(), clientToken: getClientToken() } }, {
      onSuccess: (ticket) => {
        localStorage.setItem(ticketStoreKey(slug), JSON.stringify({ id: ticket.id, token: ticket.ticketAccessToken }));
        queryClient.invalidateQueries({ queryKey: getGetPublicBusinessQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerTicketQueryKey(slug, ticket.id) });
        window.location.reload();
      },
      onError: (err) => setError(errorText(err)),
    });
  };
  if (query.isLoading) return <PageLoader label="Finding this queue" />;
  if (query.error || !query.data) return <PublicError message={errorText(query.error, 'We could not find that queue.')} onRetry={() => query.refetch()} />;
  if (savedTicket && ticketQuery.isLoading) return <PageLoader label="Finding your ticket" />;
  if (savedTicket && ticketQuery.data) return <CustomerTicketView ticket={ticketQuery.data} slug={slug} onForget={() => { localStorage.removeItem(ticketStoreKey(slug)); window.location.reload(); }} />;
  if (savedTicket && ticketQuery.error) return <PublicError message="We couldn't load the saved ticket. Your private ticket access may have expired." onRetry={() => ticketQuery.refetch()} action={<Button variant="secondary" onClick={() => { localStorage.removeItem(ticketStoreKey(slug)); window.location.reload(); }} testId="button-reset-ticket">Start over</Button>} />;
  return <div className="app-shell flex flex-col">
    <header className="mx-auto flex w-full max-w-[1060px] items-center justify-between px-5 py-5 sm:px-8"><Brand /><span className="inline-flex items-center gap-2 text-[11px] font-medium text-[#758096]"><ShieldCheck size={14} className="text-[#4c5dd4]" /> Private ticket</span></header>
    <main className="mx-auto grid w-full max-w-[1060px] flex-1 items-start gap-8 px-5 pb-12 pt-5 sm:px-8 md:grid-cols-[1fr_.82fr] md:gap-12 md:pt-12">
      <section className="fade-up">
        <p className="eyebrow">{business?.category} · VIRTUAL QUEUE</p>
        <h1 className="mt-3 font-['Manrope'] text-[clamp(36px,6vw,56px)] font-extrabold leading-[1.05] tracking-[-.075em] text-[#202a40]" data-testid="text-business-name">{business?.name}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[#737e91]">Take your place in line from here. We'll keep your ticket updated while you get on with your day.</p>
        <div className="surface mt-8 grid grid-cols-2 divide-x divide-[#edf0f4] p-5 sm:p-6">
          <div className="pr-4"><p className="eyebrow">People waiting</p><p className="mono mt-2 text-3xl text-[#29344d]" data-testid="text-waiting-count">{query.data.queue.waitingCount}</p></div>
          <div className="pl-5"><p className="eyebrow">Typical service</p><p className="mono mt-2 text-3xl text-[#29344d]">{business?.averageServiceMinutes}<span className="ml-1 text-sm text-[#8790a0]">min</span></p></div>
        </div>
        <div className="mt-5 flex gap-3 rounded-xl bg-[#edf0ff] p-4 text-[12px] leading-5 text-[#5f6a88]"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-[#5668d5]" /><p>Your ticket is private to this browser. No account or phone number needed.</p></div>
      </section>
      <section className="surface fade-up-2 p-5 sm:p-7">
        {business?.isPaused ? <div className="py-7 text-center" data-testid="status-queue-paused"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff3dd] text-[#996111]"><Pause size={20} /></span><h2 className="mt-4 text-lg font-bold text-[#303a50]">The queue is taking a pause</h2><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#788397]">New tickets aren't available right now. Check back soon.</p></div>
          : query.data.queue.availableSpots <= 0 ? <div className="py-7 text-center" data-testid="status-queue-full"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf0ff] text-[#4c5dd4]"><Users size={20} /></span><h2 className="mt-4 text-lg font-bold text-[#303a50]">The queue is full for now</h2><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#788397]">There are no open spots at the moment. Please check again in a little while.</p></div>
          : <form onSubmit={reserve} className="space-y-5">
            <div><span className="status-pill status-waiting"><span className="dot" />{query.data.queue.availableSpots} spots available</span><h2 className="mt-4 text-xl font-bold tracking-[-.045em] text-[#29334b]">Join the queue</h2><p className="mt-1 text-xs text-[#788397]">Just your name. We'll make you a ticket.</p></div>
            <Field label="Your name" placeholder="Name for your ticket" autoComplete="given-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-customer-name" />
            {error && <InlineError message={error} />}
            <Button type="submit" disabled={join.isPending} className="w-full !min-h-[48px]" testId="button-join-queue">{join.isPending ? 'Saving your place…' : <>Get my ticket <ArrowRight size={16} /></>}</Button>
            <p className="text-center text-[10px] text-[#929aa8]">By joining, you agree to be called by your ticket number.</p>
          </form>}
      </section>
    </main>
    <footer className="mx-auto flex w-full max-w-[1060px] items-center justify-between px-5 py-5 text-[10px] text-[#8b94a4] sm:px-8"><span>Powered by QueueUp</span><Link href="/" className="hover:text-[#5364d3]" data-testid="link-about-queueup">About QueueUp</Link></footer>
  </div>;
}

function CustomerTicketView({ ticket, slug, onForget }: { ticket: CustomerTicket; slug: string; onForget: () => void }) {
  const current = ticket.status;
  const statusDescription: Record<string, string> = {
    Waiting: 'You are in line. We’ll keep this page up to date.',
    Called: 'It’s your turn. Please head to the counter.',
    Serving: 'You’re being served now.',
    Completed: 'Your visit is complete. Thanks for stopping by.',
    Skipped: 'This ticket was skipped. Please speak with the business team.',
  };
  const statusClass = `status-${current.toLowerCase()}`;
  return <div className="app-shell flex flex-col">
    <header className="mx-auto flex w-full max-w-[840px] items-center justify-between px-5 py-5 sm:px-8"><Brand /><span className="flex items-center gap-1.5 text-[10px] text-[#7f899a]"><span className="size-1.5 animate-pulse rounded-full bg-[#4e9b79]" />LIVE TICKET</span></header>
    <main className="mx-auto w-full max-w-[840px] flex-1 px-5 pb-12 pt-8 sm:px-8 sm:pt-14">
      <p className="eyebrow">{ticket.businessName}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-['Manrope'] text-3xl font-extrabold tracking-[-.065em] text-[#202a40] sm:text-[42px]">Your place is saved.</h1><p className="mt-2 text-sm text-[#737e91]">Hi {ticket.customerName}, here's the latest on your visit.</p></div><span className={`status-pill ${statusClass}`} data-testid="status-ticket"><span className="dot" />{current}</span></div>
      <div className="surface mt-8 overflow-hidden">
        <div className="grid gap-px bg-[#edf0f4] sm:grid-cols-[1.1fr_.9fr]">
          <div className="bg-white p-6 sm:p-8"><p className="eyebrow">YOUR TICKET</p><p className="mono mt-3 text-[clamp(52px,12vw,88px)] font-medium leading-none tracking-[-.09em] text-[#4c5dd4]" data-testid="text-ticket-number">{ticket.ticketNumber}</p><p className="mt-5 max-w-sm text-xs leading-5 text-[#748095]" data-testid="text-ticket-message">{statusDescription[current] || statusDescription.Waiting}</p></div>
          <div className="bg-white p-5 sm:p-6">
            {current === 'Completed' || current === 'Skipped' ? <div className={`flex h-full min-h-[150px] flex-col justify-center rounded-xl p-5 ${current === 'Completed' ? 'bg-[#edf7f1] text-[#357b5b]' : 'bg-[#fff3ef] text-[#a45045]'}`}>
              <span className="flex items-center gap-2 text-xs font-bold">{current === 'Completed' ? <CheckCircle2 size={17} /> : <X size={17} />}{current === 'Completed' ? 'Visit complete' : 'Ticket skipped'}</span>
              <p className="mt-2 text-[11px] leading-5 text-[#697487]">{statusDescription[current]}</p>
            </div> : <div className="grid h-full grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f7f8fb] p-4"><p className="eyebrow">Ahead of you</p><p className="mono mt-2 text-[30px] text-[#29344d]" data-testid="text-customers-ahead">{ticket.customersAhead}</p><p className="text-[10px] text-[#8b94a4]">customers</p></div>
              <div className="rounded-xl bg-[#f7f8fb] p-4"><p className="eyebrow">Active queue</p><p className="mono mt-2 text-[30px] text-[#29344d]" data-testid="text-active-queue-size">{ticket.activeQueueSize}</p><p className="text-[10px] text-[#8b94a4]">tickets</p></div>
              <div className="rounded-xl bg-[#f7f8fb] p-4"><p className="eyebrow">Now serving</p><p className="mono mt-2 text-[25px] text-[#29344d]" data-testid="text-now-serving">{ticket.currentTicketNumber || '—'}</p><p className="text-[10px] text-[#8b94a4]">current ticket</p></div>
              <div className="rounded-xl bg-[#f7f8fb] p-4"><p className="eyebrow">Estimated wait</p><p className="mono mt-2 text-[30px] text-[#29344d]" data-testid="text-estimated-wait">{ticket.estimatedWaitMinutes}<span className="ml-1 text-xs text-[#8b94a4]">min</span></p><p className="text-[10px] text-[#8b94a4]">estimate, may change</p></div>
            </div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f4] bg-[#fafbfc] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-[11px] text-[#7c8697]"><RefreshCw size={13} className="text-[#6474d8]" /> Updates automatically every few seconds</div>
          <button onClick={onForget} className="text-[11px] font-semibold text-[#7c8697] underline decoration-[#cbd1dc] underline-offset-4 hover:text-[#39445b]" data-testid="button-clear-ticket">Clear this ticket</button>
        </div>
      </div>
      {ticket.isPaused && current === 'Waiting' && <div className="mt-4 rounded-xl bg-[#fff5e5] p-4 text-xs text-[#87642d]" data-testid="status-queue-paused">The queue is paused. Your ticket is safe and will update when service resumes.</div>}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#e1e5ed] bg-white/70 p-4 text-[11px] leading-5 text-[#7a8495]"><ShieldCheck size={16} className="shrink-0 text-[#596bd6]" /> Your ticket is private. Only you can see this name and ticket status.</div>
    </main>
    <footer className="mx-auto flex w-full max-w-[840px] justify-between px-5 py-5 text-[10px] text-[#8b94a4] sm:px-8"><span>QueueUp</span><Link href={`/q/${slug}`} className="hover:text-[#5364d3]" data-testid="link-queue-page">Queue details</Link></footer>
  </div>;
}

function PublicError({ message, onRetry, action }: { message: string; onRetry: () => void; action?: ReactNode }) {
  return <main className="app-shell grid place-items-center p-5">
    <section className="surface w-full max-w-md p-7 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0ee] text-[#b94b41]"><X size={20} /></span>
      <h1 className="mt-4 text-xl font-bold tracking-[-.04em] text-[#29334a]">That page didn't load</h1>
      <p className="mt-2 text-sm leading-6 text-[#788397]">{message}</p>
      <div className="mt-5 flex justify-center gap-2"><Button variant="secondary" onClick={onRetry} testId="button-retry-page"><RefreshCw size={14} /> Try again</Button>{action}</div>
      <Link href="/" className="mt-6 inline-block text-xs font-semibold text-[#5868d4]" data-testid="link-home-error">Back to QueueUp</Link>
    </section>
  </main>;
}

function ManagePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const query = useGetManagementDashboard(slug, { query: { queryKey: getGetManagementDashboardQueryKey(slug), refetchInterval: 3000 } });
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreated, setShowCreated] = useState(
    () => new URLSearchParams(window.location.search).get('created') === '1',
  );
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const login = useLoginBusiness();
  const logout = useLogoutBusiness();
  const callNext = useCallNextCustomer();
  const recall = useRecallCurrentCustomer();
  const updateQueue = useUpdateQueueState();
  const updateBusiness = useUpdateBusiness();
  const start = useStartService();
  const complete = useCompleteService();
  const skip = useSkipTicket();
  const isLoading = callNext.isPending || recall.isPending || updateQueue.isPending || updateBusiness.isPending || start.isPending || complete.isPending || skip.isPending;
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetManagementDashboardQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getGetPublicBusinessQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getGetQueueDisplayQueryKey(slug) }),
  ]);
  const runAction = async (action: () => Promise<unknown>, successMessage = 'Queue updated.') => {
    setActionError('');
    setActionSuccess('');
    try { await action(); await refresh(); setActionSuccess(successMessage); } catch (error) { setActionError(errorText(error)); }
  };
  const signIn = (event: FormEvent) => {
    event.preventDefault();
    setLoginError('');
    login.mutate({ slug, data: { accessCode: loginCode } }, {
      onSuccess: async () => {
        setLoginCode('');
        await refresh();
      },
      onError: (error) => setLoginError(errorText(error, 'That access code did not work.')),
    });
  };
  const dashboard = query.data;
  if (query.isLoading) return <PageLoader label="Opening owner dashboard" />;
  if (!dashboard) return <div className="app-shell">
    <header className="mx-auto flex max-w-[1040px] items-center justify-between px-5 py-5 sm:px-8"><Brand /><Link href="/" className="text-xs font-semibold text-[#6d788c]" data-testid="link-manage-home">QueueUp home</Link></header>
    <main className="mx-auto grid max-w-[1040px] gap-10 px-5 pb-12 pt-8 sm:px-8 md:grid-cols-[.9fr_1.1fr] md:pt-14">
      <div><p className="eyebrow">OWNER ACCESS</p><h1 className="mt-4 font-['Manrope'] text-[42px] font-extrabold leading-tight tracking-[-.07em] text-[#202a40]">Your queue,<br />your rhythm.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-[#737e91]">Sign in to call customers, update your queue, and keep the day moving.</p><div className="mt-8 flex items-center gap-3 rounded-xl bg-[#edf0ff] p-4 text-xs leading-5 text-[#64708d]"><LockKeyhole size={16} className="shrink-0 text-[#5567d4]" /> Your access code stays in this form only. QueueUp never stores it on this device.</div></div>
      <form onSubmit={signIn} className="surface mx-auto w-full max-w-[480px] p-6 sm:p-8">
        <div className="grid size-11 place-items-center rounded-xl bg-[#edf0ff] text-[#4c5dd4]"><LockKeyhole size={19} /></div>
        <h2 className="mt-5 text-xl font-bold tracking-[-.04em] text-[#29344c]">Owner sign in</h2><p className="mt-1 text-xs text-[#7c8698]">Enter the access code you chose when you set up this business.</p>
        <div className="mt-6 space-y-4"><Field label="Access code" type="password" minLength={6} maxLength={128} autoComplete="current-password" placeholder="Your owner access code" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} required data-testid="input-owner-access-code" />
          {(loginError || (query.error && !loginError)) && <InlineError message={loginError || 'Sign in to access this owner dashboard.'} />}
          <Button type="submit" disabled={login.isPending} className="w-full !min-h-[47px]" testId="button-owner-sign-in">{login.isPending ? 'Signing in…' : <>Open dashboard <ArrowRight size={15} /></>}</Button>
          {query.error && <button type="button" className="w-full pt-1 text-[11px] font-semibold text-[#68748a] underline underline-offset-4" onClick={() => query.refetch()} data-testid="button-retry-dashboard">Check sign-in again</button>}
        </div>
      </form>
    </main>
  </div>;
  const waitingTickets = dashboard.tickets.filter((ticket) => ticket.status === 'Waiting');
  const currentTicket = dashboard.tickets.find((ticket) => ticket.status === 'Serving' || ticket.status === 'Called');
  const nextUp = waitingTickets[0];
  const activeStatus = currentTicket?.status;
  const hasCurrent = Boolean(currentTicket);
  const allBusy = isLoading || logout.isPending;
  const handleLogout = () => logout.mutate({ slug }, { onSuccess: async () => { queryClient.removeQueries({ queryKey: getGetManagementDashboardQueryKey(slug) }); query.refetch(); } });
  const ticketAction = (kind: 'start' | 'complete' | 'skip', ticketId: string) => {
    if (kind === 'skip' && !window.confirm('Skip this ticket? The customer will leave the active queue.')) return;
    return runAction(() => {
      if (kind === 'start') return start.mutateAsync({ slug, ticketId });
      if (kind === 'complete') return complete.mutateAsync({ slug, ticketId });
      return skip.mutateAsync({ slug, ticketId });
    }, kind === 'start' ? 'Service started.' : kind === 'complete' ? 'Service completed.' : 'Ticket skipped.');
  };
  return <div className="app-shell">
    <header className="border-b border-[#dfe4ec] bg-white/80">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><Brand compact /><span className="h-6 w-px bg-[#e2e6ee]" /><div className="min-w-0"><p className="truncate text-sm font-bold text-[#2c364d]" data-testid="text-manage-business">{dashboard.business.name}</p><p className="eyebrow !text-[9px]">{dashboard.business.category}</p></div></div>
        <div className="flex items-center gap-2">
          <Link href={`/q/${slug}`} target="_blank" className="btn btn-secondary !min-h-[38px] !px-3 !text-[11px]" data-testid="link-public-booking"><ExternalLink size={14} /><span className="hidden sm:inline">Booking page</span></Link>
          <Link href={`/display/${slug}`} target="_blank" className="btn btn-secondary !min-h-[38px] !px-3 !text-[11px]" data-testid="link-public-display"><Monitor size={14} /><span className="hidden sm:inline">TV display</span></Link>
          <button onClick={handleLogout} className="grid size-9 place-items-center rounded-lg text-[#7c8698] transition hover:bg-[#f2f4f8] hover:text-[#3a465e]" aria-label="Sign out" title="Sign out" data-testid="button-owner-sign-out"><LogOut size={17} /></button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1360px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">OWNER DASHBOARD · LIVE</p><h1 className="mt-2 font-['Manrope'] text-[30px] font-extrabold tracking-[-.065em] text-[#222d44] sm:text-[36px]">Good day, let's keep it moving.</h1><p className="mt-1 text-xs text-[#838d9f]">Your queue refreshes automatically every few seconds.</p></div>
        <div className="flex items-center gap-2"><span className={`status-pill ${dashboard.business.isPaused ? 'status-called' : 'status-serving'}`} data-testid="status-queue-state"><span className="dot" />{dashboard.business.isPaused ? 'Bookings paused' : 'Taking customers'}</span><Button variant="secondary" disabled={allBusy} onClick={() => runAction(() => updateQueue.mutateAsync({ slug, data: { isPaused: !dashboard.business.isPaused } }), dashboard.business.isPaused ? 'Bookings have resumed.' : 'New bookings are paused.')} testId="button-pause-resume">{dashboard.business.isPaused ? <><Play size={14} /> Resume queue</> : <><Pause size={14} /> Pause queue</>}</Button></div>
      </div>
      {showCreated && <section className="surface mb-6 p-5 sm:p-6" aria-live="polite" data-testid="status-business-created">
        <div className="flex items-start justify-between gap-4">
          <div><p className="eyebrow">YOUR QUEUE IS READY</p><h2 className="mt-2 text-lg font-bold tracking-[-.04em] text-[#29334a]">{dashboard.business.name}</h2><p className="mt-1 text-xs leading-5 text-[#788397]">Save these links to share the queue and return to your owner dashboard.</p></div>
          <button onClick={() => { setShowCreated(false); window.history.replaceState({}, '', window.location.pathname); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-[#7c8698] hover:bg-[#f2f4f8]" aria-label="Dismiss setup confirmation"><X size={16} /></button>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          <CopyLinkRow title="Customer booking" href={`/q/${slug}`} detail="Public link for customers" />
          <CopyLinkRow title="Owner dashboard" href={`/manage/${slug}`} detail="Private link for business management" />
          <CopyLinkRow title="TV display" href={`/display/${slug}`} detail="Ticket numbers only" />
        </div>
      </section>}
      {actionError && <div className="mb-5"><InlineError message={actionError} onRetry={() => { setActionError(''); query.refetch(); }} /></div>}
      {actionSuccess && <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#cfe7d9] bg-[#f0f8f3] px-4 py-3 text-xs font-semibold text-[#357b5b]" role="status" data-testid="status-action-success"><CheckCircle2 size={15} />{actionSuccess}</div>}
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Waiting" value={dashboard.stats.waitingCustomers} icon={<Users size={17} />} tint="indigo" detail="in the queue" />
        <StatTile label="Being served" value={dashboard.stats.currentlyServing} icon={<Activity size={17} />} tint="green" detail="right now" />
        <StatTile label="Completed tickets" value={dashboard.stats.completedTickets} icon={<CheckCircle2 size={17} />} tint="slate" detail="all time" />
        <StatTile label="Average wait" value={`${dashboard.stats.averageWaitingMinutes}m`} icon={<Clock3 size={17} />} tint="amber" detail="recent customers" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.48fr_.82fr]">
        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f4] px-5 py-4 sm:px-6">
            <div><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-[#303a50]">Your queue</h2><span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.09em] text-[#7a8598]"><span className="size-1.5 animate-pulse rounded-full bg-[#45a27b]" /> Live</span></div><p className="mt-1 text-[10px] text-[#8992a1]">Tickets stay in order. Names are only visible here.</p></div>
            <Button variant="quiet" className="!min-h-[34px] !px-2 !text-[11px]" onClick={() => query.refetch()} testId="button-refresh-queue"><RefreshCw size={13} /> Refresh</Button>
          </div>
          {hasCurrent && currentTicket ? <div className="border-b border-[#edf0f4] bg-[#f6f7ff] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-white font-['DM_Mono'] text-[17px] font-medium text-[#4c5dd4] shadow-sm">{currentTicket.ticketNumber}</span><div><p className="eyebrow !text-[#6673ba]">{activeStatus === 'Serving' ? 'NOW SERVING' : 'CALLED TO COUNTER'}</p><p className="mt-1 text-sm font-bold text-[#2c364f]">{currentTicket.customerName}</p></div></div>
              <div className="flex flex-wrap gap-2">{activeStatus === 'Called' && <Button disabled={allBusy} onClick={() => ticketAction('start', currentTicket.id)} testId="button-start-service"><Play size={14} /> Start service</Button>}{activeStatus === 'Serving' && <Button disabled={allBusy} onClick={() => ticketAction('complete', currentTicket.id)} testId="button-complete-service"><Check size={14} /> Complete</Button>}<Button variant="secondary" disabled={allBusy} onClick={() => runAction(() => recall.mutateAsync({ slug }), 'Current ticket recalled.')} testId="button-recall-customer"><BellRing size={14} /> Recall</Button><Button variant="danger" disabled={allBusy} onClick={() => ticketAction('skip', currentTicket.id)} testId="button-skip-current"><SkipForward size={14} /> Skip</Button></div>
            </div>
          </div> : <div className="flex items-center justify-between gap-4 border-b border-[#edf0f4] bg-[#f7f8fb] px-5 py-5 sm:px-6">
            <div><p className="eyebrow">READY WHEN YOU ARE</p><p className="mt-1 text-sm font-semibold text-[#313c54]">{nextUp ? `${nextUp.customerName} is next` : 'No one is waiting right now'}</p><p className="mt-1 text-[10px] text-[#828c9e]">{nextUp ? `Ticket ${nextUp.ticketNumber} · joined ${formatTime(nextUp.createdAt)}` : 'Your queue is clear.'}</p></div>
            <Button disabled={!nextUp || allBusy} onClick={() => runAction(() => callNext.mutateAsync({ slug }), 'Next customer called.')} className="shrink-0" testId="button-call-next"><ArrowRight size={15} /> Call next</Button>
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[590px] text-left">
              <thead><tr className="border-b border-[#edf0f4] text-[9px] font-semibold uppercase tracking-[.1em] text-[#8791a2]"><th className="px-5 py-3 sm:px-6">Ticket</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Joined</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right sm:px-6">Action</th></tr></thead>
              <tbody>{dashboard.tickets.length === 0 ? <tr><td colSpan={5} className="px-6 py-14 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#f0f2f7] text-[#7a85a0]"><Ticket size={18} /></span><p className="mt-3 text-xs font-semibold text-[#576278]">No tickets yet</p><p className="mt-1 text-[10px] text-[#929bab]">Share your booking link to welcome your first customer.</p></td></tr>
                : dashboard.tickets.map((ticket) => <tr key={ticket.id} className="border-b border-[#f0f2f6] last:border-0 hover:bg-[#fafbfc]" data-testid={`row-ticket-${ticket.id}`}>
                  <td className="px-5 py-3.5 sm:px-6"><span className="mono text-xs font-medium text-[#4453bd]">{ticket.ticketNumber}</span></td><td className="px-3 py-3.5"><span className="text-xs font-semibold text-[#38435a]">{ticket.customerName}</span></td><td className="px-3 py-3.5 text-[10px] text-[#828c9d]">{formatTime(ticket.createdAt)}</td><td className="px-3 py-3.5"><StatusBadge status={ticket.status} /></td><td className="px-5 py-3.5 text-right sm:px-6">{ticket.status === 'Waiting' ? <div className="flex justify-end gap-3"><button className="text-[10px] font-semibold text-[#4c5dd4] hover:underline disabled:cursor-not-allowed disabled:opacity-50" onClick={() => runAction(() => callNext.mutateAsync({ slug }), 'Next customer called.')} disabled={allBusy || hasCurrent} data-testid={`button-call-ticket-${ticket.id}`}>Call next</button><button className="text-[10px] font-semibold text-[#b94b41] hover:underline" onClick={() => ticketAction('skip', ticket.id)} disabled={allBusy} data-testid={`button-skip-ticket-${ticket.id}`}>Skip</button></div> : ticket.status === 'Called' ? <button className="text-[10px] font-semibold text-[#4c5dd4] hover:underline" onClick={() => ticketAction('start', ticket.id)} disabled={allBusy} data-testid={`button-start-ticket-${ticket.id}`}>Start</button> : ticket.status === 'Serving' ? <div className="flex justify-end gap-3"><button className="text-[10px] font-semibold text-[#4c5dd4] hover:underline" onClick={() => ticketAction('complete', ticket.id)} disabled={allBusy} data-testid={`button-complete-ticket-${ticket.id}`}>Complete</button><button className="text-[10px] font-semibold text-[#b94b41] hover:underline" onClick={() => ticketAction('skip', ticket.id)} disabled={allBusy} data-testid={`button-skip-ticket-${ticket.id}`}>Skip</button></div> : <span className="text-[10px] text-[#a0a7b4]">—</span>}</td>
                </tr>)}</tbody>
            </table>
          </div>
          {dashboard.tickets.length > 0 && <div className="flex items-center justify-between border-t border-[#edf0f4] bg-[#fafbfc] px-5 py-3 text-[10px] text-[#8992a1] sm:px-6"><span>{dashboard.tickets.length} recent {dashboard.tickets.length === 1 ? 'ticket' : 'tickets'}</span><span>Refreshes every 3 seconds</span></div>}
        </section>
        <aside className="space-y-5">
          <section className="surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">QUICK LINKS</p><h2 className="mt-1 text-sm font-bold text-[#303a50]">Share the right screen</h2></div><Sparkles size={17} className="text-[#6474d8]" /></div>
            <div className="mt-4 space-y-2">
              <CopyLinkRow title="Customer booking" href={`/q/${slug}`} detail="Let customers reserve a spot" />
              <CopyLinkRow title="Owner dashboard" href={`/manage/${slug}`} detail="Private business management link" />
              <CopyLinkRow title="Public TV display" href={`/display/${slug}`} detail="Shows ticket numbers, never names" />
            </div>
          </section>
          <section className="surface overflow-hidden">
            <button onClick={() => setShowSettings((value) => !value)} className="flex w-full items-center justify-between p-5 text-left sm:p-6" aria-expanded={showSettings} data-testid="button-toggle-settings"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#f0f2f7] text-[#5d6880]"><Settings2 size={17} /></span><div><p className="text-sm font-bold text-[#303a50]">Queue settings</p><p className="mt-1 text-[10px] text-[#8992a1]">Business details and service pace</p></div></div><ChevronRight size={17} className={`text-[#8b94a3] transition-transform ${showSettings ? 'rotate-90' : ''}`} /></button>
            {showSettings && <SettingsForm dashboard={dashboard} pending={updateBusiness.isPending} onSave={(data) => runAction(() => updateBusiness.mutateAsync({ slug, data }), 'Business settings saved.')} />}
          </section>
          <div className="rounded-xl border border-[#e0e5ed] bg-[#f8f9fb] p-4">
            <p className="eyebrow">QUEUE STATUS</p><div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#536078]">Customer reservations</span><span className={`text-[10px] font-bold ${dashboard.business.isPaused ? 'text-[#9a6a20]' : 'text-[#378464]'}`}>{dashboard.business.isPaused ? 'Paused' : 'Open'}</span></div><p className="mt-2 text-[10px] leading-4 text-[#858fa0]">{dashboard.business.isPaused ? 'Existing tickets remain active. Resume whenever you are ready.' : `Up to ${dashboard.business.maxActiveCapacity} people can join the queue.`}</p>
          </div>
        </aside>
      </div>
    </main>
  </div>;
}

function StatTile({ label, value, icon, tint, detail }: { label: string; value: string | number; icon: ReactNode; tint: string; detail: string }) {
  const colors: Record<string, string> = { indigo: 'bg-[#eef0ff] text-[#5869d7]', green: 'bg-[#e8f5ef] text-[#3d8a6b]', slate: 'bg-[#edf0f4] text-[#657187]', amber: 'bg-[#fff4e2] text-[#a4752e]' };
  return <div className="surface p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-[#7c8698] sm:text-[11px]">{label}</p><span className={`grid size-8 place-items-center rounded-lg ${colors[tint]}`}>{icon}</span></div><div className="mt-3 flex items-baseline gap-2"><p className="mono text-[27px] leading-none text-[#28334c]" data-testid={`text-stat-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p><span className="hidden text-[9px] text-[#949cab] sm:block">{detail}</span></div></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-pill status-${status.toLowerCase()} !px-2 !py-1 !text-[9px]`} data-testid={`status-ticket-${status.toLowerCase()}`}><span className="dot !size-1.5" />{status}</span>;
}

function CopyLinkRow({ title, href, detail }: { title: string; href: string; detail: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const fullUrl = `${window.location.origin}${href}`;
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { window.open(fullUrl, '_blank', 'noopener,noreferrer'); }
  };
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e8ebf1] p-3">
    <div className="min-w-0"><p className="text-[11px] font-semibold text-[#38435a]">{title}</p><p className="mt-0.5 truncate text-[9px] text-[#8a94a4]">{detail}</p><p className="mono mt-1 truncate text-[9px] text-[#5a6680]">{window.location.origin}{href}</p></div>
    <div className="flex shrink-0 items-center gap-1.5"><Link href={href} target="_blank" className="grid size-8 place-items-center rounded-lg text-[#758096] hover:bg-[#f2f4f8]" aria-label={`Open ${title}`} data-testid={`link-open-${title.toLowerCase().replaceAll(' ', '-')}`}><ExternalLink size={14} /></Link><button onClick={copy} className="btn btn-secondary !min-h-[32px] !px-2.5 !text-[10px]" data-testid={`button-copy-${title.toLowerCase().replaceAll(' ', '-')}`}>{copied ? <><Check size={12} /> Copied</> : 'Copy link'}</button></div>
  </div>;
}

function SettingsForm({ dashboard, pending, onSave }: {
  dashboard: ManagementDashboard;
  pending: boolean;
  onSave: (data: { name: string; category: typeof BusinessCategory[keyof typeof BusinessCategory]; averageServiceMinutes: number; maxActiveCapacity: number }) => void;
}) {
  const [name, setName] = useState(dashboard.business.name);
  const [category, setCategory] = useState(dashboard.business.category);
  const [minutes, setMinutes] = useState(String(dashboard.business.averageServiceMinutes));
  const [capacity, setCapacity] = useState(String(dashboard.business.maxActiveCapacity));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ name, category, averageServiceMinutes: Number(minutes), maxActiveCapacity: Number(capacity) });
  };
  return <form onSubmit={submit} className="space-y-4 border-t border-[#edf0f4] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
    <Field label="Business name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required data-testid="input-setting-name" />
    <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} data-testid="select-setting-category">{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
    <div className="grid grid-cols-2 gap-3"><Field label="Minutes per service" type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} required data-testid="input-setting-minutes" /><Field label="Queue capacity" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} required data-testid="input-setting-capacity" /></div>
    <Button type="submit" disabled={pending} className="w-full !min-h-[42px]" testId="button-save-settings">{pending ? 'Saving changes…' : 'Save settings'}</Button>
  </form>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function DisplayPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const query = useGetQueueDisplay(slug, { query: { queryKey: getGetQueueDisplayQueryKey(slug), refetchInterval: 3000 } });
  const display = query.data;
  if (query.isLoading) return <PageLoader label="Connecting to live display" />;
  if (query.error || !display) return <PublicError message={errorText(query.error, 'We could not connect to this queue display.')} onRetry={() => query.refetch()} />;
  return <main className="app-shell flex min-h-[100dvh] flex-col bg-[#202b46] text-white">
    <header className="flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/10 text-[#b7c0ff]"><Activity size={21} /></span><div><p className="font-['Manrope'] text-sm font-bold tracking-[-.04em] text-white sm:text-base" data-testid="text-display-business">{display.businessName}</p><p className="eyebrow !text-[9px] !text-[#a4aec5]">LIVE QUEUE DISPLAY</p></div></div>
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-2 text-[9px] font-semibold tracking-[.1em] text-[#c0c9dc]"><span className="size-1.5 animate-pulse rounded-full bg-[#7dd5ac]" /> LIVE</div>
    </header>
    <section className="soft-grid flex flex-1 flex-col justify-center px-5 pb-10 sm:px-10">
      <div className="mx-auto w-full max-w-[1300px]">
        {display.isPaused && <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border border-[#9b7942]/40 bg-[#564a35]/50 px-4 py-2 text-xs font-medium text-[#f0d7a4]" data-testid="status-display-paused"><Pause size={14} /> Queue paused</div>}
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div className="text-center lg:text-left"><p className="eyebrow !text-[#a6b1ca]">NOW SERVING</p><p className="mono mt-5 text-[clamp(100px,24vw,260px)] font-medium leading-[.88] tracking-[-.11em] text-white" data-testid="text-current-ticket">{display.currentTicketNumber || '—'}</p><div className="mt-8 flex items-center justify-center gap-3 text-[#a9b3c8] lg:justify-start"><span className="size-2 rounded-full bg-[#7dd5ac]" /><span className="text-sm">Please come to the counter</span></div></div>
          <div className="mx-auto w-full max-w-[490px]">
            <div className="flex items-end justify-between border-b border-white/15 pb-3"><div><p className="eyebrow !text-[#a6b1ca]">UP NEXT</p><h2 className="mt-2 font-['Manrope'] text-2xl font-bold tracking-[-.05em] text-white sm:text-3xl">Please be ready</h2></div><div className="flex items-center gap-2 text-xs text-[#b2bdd2]"><Users size={15} />{display.waitingCount} waiting</div></div>
            {display.nextTicketNumbers.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {display.nextTicketNumbers.map((number, index) => <div key={`${number}-${index}`} className={`rounded-2xl border p-5 text-center ${index === 0 ? 'border-[#8995ec]/45 bg-[#4d5c9b]/45' : 'border-white/10 bg-white/[.055]'}`} data-testid={`card-next-ticket-${index}`}><p className="eyebrow !text-[#a6b1ca]">{index === 0 ? 'NEXT' : `AFTER ${index}`}</p><p className={`mono mt-3 text-[clamp(28px,5vw,45px)] font-medium tracking-[-.07em] ${index === 0 ? 'text-[#dce0ff]' : 'text-[#e7eaf1]'}`} data-testid={`text-next-ticket-${index}`}>{number}</p></div>)}
            </div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center"><p className="text-sm font-medium text-[#d0d6e2]">No one is waiting</p><p className="mt-1 text-xs text-[#929db3]">The next ticket will appear here.</p></div>}
          </div>
        </div>
        <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-4 text-[9px] text-[#96a1b8]"><span>QueueUp · Ticket numbers only</span><span className="flex items-center gap-1.5"><RefreshCw size={11} /> Updates automatically</span></div>
      </div>
    </section>
  </main>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/create" component={CreateBusiness} />
      <Route path="/q/:slug" component={BookingPage} />
      <Route path="/manage" component={ManageEntry} />
      <Route path="/manage/:slug" component={ManagePage} />
      <Route path="/display/:slug" component={DisplayPage} />
      <Route component={NotFound} />
    </Switch>
  </ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
