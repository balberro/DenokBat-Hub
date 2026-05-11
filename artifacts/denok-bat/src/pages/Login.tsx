import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useAppLogin } from "@/hooks/use-app-api";
import { useLocation, Link } from "wouter";

export default function Login() {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm();
  const loginMutation = useAppLogin();
  const [, setLocation] = useLocation();

  const onSubmit = (data: any) => {
    loginMutation.mutate({ data }, {
      onSuccess: () => {
        setLocation('/panel');
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`} 
          alt="Logo" 
          className="mx-auto h-24 w-auto mb-6 bg-white p-2 rounded-2xl shadow-sm border border-border"
        />
        <h2 className="text-center text-4xl font-extrabold text-foreground mb-2">
          {t('nav.login')}
        </h2>
        <p className="text-lg text-muted-foreground text-balance">
          {t('auth.login_subtitle')}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-xl shadow-black/5 rounded-3xl border border-border sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-lg font-medium text-foreground mb-2">
                {t('auth.username')}
              </label>
              <Input 
                {...register('username', { required: true })}
                className="w-full text-lg h-14 bg-muted/30 border-2 focus:border-primary focus:ring-primary/20" 
                placeholder="Ej: juan.perez"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-foreground mb-2">
                {t('auth.password')}
              </label>
              <Input 
                type="password"
                {...register('password', { required: true })}
                className="w-full text-lg h-14 bg-muted/30 border-2 focus:border-primary focus:ring-primary/20" 
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-red-600 text-center">
                {loginMutation.errorMessage || t('common.error')}
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full text-lg h-14 mt-4"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t('common.loading') : t('auth.login_cta')}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-muted-foreground">
            <p>
              {t('auth.no_member')}{' '}
              <Link href="/contacto" className="text-primary font-bold hover:underline">
                {t('auth.contact_us')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
