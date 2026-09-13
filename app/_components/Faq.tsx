const ITEMS = [
  {
    q: "Why are there several tokens for the same stock?",
    a: "Different companies each issue their own token for the same underlying share. They use different legal structures and trade in separate pools, so their prices and their liquidity are not the same. Nothing on a swap screen tells you which one you are looking at.",
  },
  {
    q: "What does it mean that the issuer can freeze my tokens?",
    a: "Most of these tokens are built with Solana's Token-2022 standard, which lets the issuer keep powers over tokens that are already in your wallet. Some can freeze your balance so you cannot sell. Some can move the tokens out of your wallet without your signature. We read this straight from the blockchain and tell you which applies.",
  },
  {
    q: "Why do you say a token is a trap?",
    a: "Because buying it costs you money immediately. If a pool is thin, a $1,000 order can lose more than $100 the instant it settles, and selling costs you again. The token still shows a normal price on every screen. We ask the aggregator for a real quote at real sizes and show you the damage in dollars.",
  },
  {
    q: "Does Parity hold my money?",
    a: "No. Parity never takes custody, never asks for your private key and never moves funds. You can use the whole site without connecting a wallet.",
  },
  {
    q: "Where do your numbers come from?",
    a: "Live quotes from the Jupiter aggregator and mint data read directly from a Solana node. We record a measurement every fifteen minutes and commit it to our public repository, so the history is timestamped and you can verify any figure we publish.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="mt-24 scroll-mt-8">
      <h2 className="text-3xl font-black tracking-tight">Questions</h2>
      <dl className="mt-8">
        {ITEMS.map((item) => (
          <div key={item.q} className="border-t border-rule py-7">
            <dt className="text-xl font-bold tracking-tight max-w-[52ch]">
              {item.q}
            </dt>
            <dd className="mt-2 text-lg leading-snug max-w-[68ch] text-ink/80">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
