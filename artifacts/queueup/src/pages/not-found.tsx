import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useLanguage, useT } from '@/lib/i18n';

export default function NotFound() {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="absolute end-5 top-5"><button
        type="button"
        onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
        aria-label={t(language === 'fa' ? 'Switch to English' : 'Switch to Persian')}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600"
        data-testid="button-language-toggle"
      >{language === 'fa' ? 'English' : 'فارسی'}</button></div>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('404 Page Not Found')}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {t('Did you forget to add the page to the router?')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
