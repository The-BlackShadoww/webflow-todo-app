import { useEffect, useState } from "react";

export default function AuthScreen() {
  const [authUrl, setAuthUrl] = useState("");

  useEffect(() => {
    window._myWebflow.getSiteInfo().then(({ siteId, shortName }) => {
      const state = btoa(
        JSON.stringify({
          siteId,
          returnUrl: `https://webflow.com/design/${shortName}`,
        }),
      );
      setAuthUrl(
        `${import.meta.env.VITE_DATA_CLIENT_URL}/webflow/install?state=${encodeURIComponent(state)}`,
      );
    });
  }, []);

  return (
    <main className="flex h-screen items-center justify-center bg-[#1e1e1e] px-6 text-white">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-lg border border-white/10 bg-[#242424] p-5">
        <div>
          <h1 className="text-[18px] font-bold">Connect Webflow</h1>
          <p className="mt-2 text-[13px] leading-5 text-white/60">
            This site needs permission before the todo element can be copied and
            published with the runtime script.
          </p>
        </div>
        {authUrl && (
          <a
            href={authUrl}
            target="_top"
            className="rounded-md bg-[#006acc] px-4 py-2 text-center text-[13px] font-semibold text-white"
          >
            Authenticate Site
          </a>
        )}
      </div>
    </main>
  );
}
