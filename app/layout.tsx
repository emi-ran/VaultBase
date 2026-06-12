import { Geist_Mono, Noto_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { LanguageProvider } from "../components/i18n-provider";
import { Sidebar } from "../components/sidebar";
import { Locale } from "../lib/i18n";
import { cn } from "../lib/utils";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased dark", fontMono.variable, "font-sans", notoSans.variable)}
      style={{ colorScheme: "dark" }}
    >
      <body className="bg-[#090807] text-[#E6E4DD] font-sans antialiased overflow-hidden">
        <ThemeProvider>
          <LanguageProvider initialLocale={locale}>
            <div className="flex h-screen w-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#090807]">
                {children}
              </main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
