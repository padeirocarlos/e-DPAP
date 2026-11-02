import Link from "next/link";
import { lang } from "next/root-params";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale } from "@/i18n/config";
import { routes } from "@/config/routes";

export default async function NotFound() {
  const dict = await getDictionary();
  const locale = resolveLocale(await lang());
  const nf = dict.errors.notFound;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{nf.title}</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {nf.description}
      </p>
      <Link
        href={routes.dashboard(locale)}
        className="mt-6 inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        {nf.backHome}
      </Link>
    </div>
  );
}
