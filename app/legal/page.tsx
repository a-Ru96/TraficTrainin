import Link from "next/link";
import { contactEmail } from "@/lib/site";

export const metadata = { title: "Privacy, terms & credits · Roadly" };

const UPDATED = "13 November 2026";

export default function Legal() {
  const contact = contactEmail();
  return (
    <article className="prose">
      <div className="page-head">
        <h1>Privacy, terms &amp; credits</h1>
        <p className="muted">Last updated {UPDATED}. Plain-English summary of how Roadly works with your data.</p>
      </div>

      <h2>What Roadly is</h2>
      <p>
        Roadly is an independent study aid for learning UK road signs and road safety. It is not an official DVSA, DfT or
        government service and is not affiliated with them. We check the content against the Highway Code, but it can be out of
        date or contain mistakes, so always confirm important rules with current official sources before your theory test.
      </p>

      <h2>Using Roadly as a guest</h2>
      <p>
        Nothing about your study is sent to our servers. Your progress (XP, streak, cards you know, best match time) is saved in your
        own browser using local storage. Clearing your browser data removes it.
      </p>

      <h2>If you create an account</h2>
      <p>We store:</p>
      <ul>
        <li>your <b>email address</b> and <b>nickname</b> (the nickname is shown on the leaderboard),</li>
        <li>your <b>password</b>, only as a salted bcrypt hash, never in plain text,</li>
        <li>your study data: XP, streak, daily XP totals, which cards you know, and quiz and match results.</li>
      </ul>
      <p>
        For security we also keep short-lived records of failed log-in and password-reset attempts, linked to the email address and
        IP address used. They are used only to block guessing and abuse and are deleted automatically, normally within a day. Our
        hosting provider may also keep standard request logs (including IP addresses) to run and secure the service.
      </p>
      <p>We use this data to run your account, sync your progress, build the leaderboard and keep the service secure. We do not sell it, and there is no advertising or analytics.</p>

      <h2>Cookies and storage</h2>
      <p>
        When you are logged in we set one strictly necessary, HTTP-only cookie that keeps you signed in for up to 30 days. Guest progress
        uses your browser&apos;s local storage. We use no advertising, tracking or analytics cookies, and fonts are served from our own
        site, so no third party sees your visit.
      </p>

      <h2>Who handles the data</h2>
      <ul>
        <li><b>Vercel</b> hosts the website.</li>
        <li><b>Neon</b> hosts the database.</li>
        <li><b>Resend</b> (or the email provider the operator configures) sends password-reset emails, only when you request one.</li>
      </ul>
      <p>These providers may process data outside the UK or EU under their own safeguards.</p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your account until you delete it. You can delete it yourself at any time on the{" "}
        <Link href="/login">account page</Link> (“Delete my account”). That immediately and permanently removes your account, progress,
        XP and leaderboard entry.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK GDPR you can ask to see, correct or delete your data, to restrict or object to how it is used, and to complain to the
        Information Commissioner&apos;s Office (ico.org.uk). Roadly is meant for learners aged 13 and over.
        {contact ? <> To exercise a right, email <a href={`mailto:${contact}`}>{contact}</a>.</> : null}
      </p>

      <h2>Terms of use</h2>
      <ul>
        <li>Roadly is provided as is, free of charge, with no guarantee that it is accurate, complete or always available.</li>
        <li>Don&apos;t cheat the leaderboard, attack or overload the service, scrape it, or use an offensive nickname. We may remove accounts or nicknames that break these rules.</li>
        <li>You are responsible for keeping your password safe.</li>
      </ul>

      <h2>Credits</h2>
      <ul>
        <li>Rules and facts are based on <b>The Highway Code</b> and other GOV.UK guidance, published under the Open Government Licence v3.0 (contains public sector information).</li>
        <li>UK traffic sign artwork is based on government traffic sign diagrams (Crown copyright, Department for Transport) and public-domain symbols. Dashboard warning-light icons are generic illustrations; real symbols and meanings vary between manufacturers, so check your vehicle handbook.</li>
        <li>If you hold rights to an image and want it removed or credited differently, please get in touch{contact ? <> at <a href={`mailto:${contact}`}>{contact}</a></> : null}.</li>
      </ul>
    </article>
  );
}
