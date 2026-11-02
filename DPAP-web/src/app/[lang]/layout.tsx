import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { lang } from "next/root-params";
import "../globals.css";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale, locales } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Required by Cache Components: every locale must have at least one value.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: {
      default: dict.app.name,
      template: `%s · ${dict.app.name}`,
    },
    description: dict.app.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = resolveLocale(await lang());
  const dict = await getDictionary();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <I18nProvider dict={dict} locale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
