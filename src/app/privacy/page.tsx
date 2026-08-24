import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | GAME ON — Premium Sports Destination",
  description:
    "How Game On Multi Sports Complex collects, uses, and protects your personal information.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-display font-bold text-go-white">{title}</h2>
      <div className="space-y-3 text-sm text-go-off/60 leading-relaxed">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="August 23, 2026">
      <Section title="1. Introduction">
        <P>
          Game On Multi Sports Complex (“Game On,” “we,” “us,” or “our”) is committed to protecting the
          privacy of every person who visits our website at game-on.in (the “Website”), makes a booking,
          or uses our facilities and services located at Sports Cube Campus, Sector 70, Gurugram, Haryana
          122101, India (collectively, the “Services”).
        </P>
        <P>
          This Privacy Policy explains what information we collect, why we collect it, how we use and
          protect it, and the choices you have regarding your personal information. It applies to all
          personal information we handle, whether collected online through the Website or offline at our
          premises, and it forms part of our Terms of Use.
        </P>
        <P>
          By using the Website or the Services, you agree to the collection and use of your information as
          described in this Privacy Policy. Please read this policy carefully.
        </P>
      </Section>

      <Section title="2. Information We Collect">
        <P>
          We collect information you provide directly to us. This includes your name, email address, phone
          number, and any other details you submit when you create an account, sign up for our mailing list,
          make a booking, contact us, or participate in any community or promotional feature. We may also
          collect information you provide in person at our premises, such as at reception or during events.
        </P>
        <P>
          We also collect certain information automatically when you use the Website, including your IP
          address, browser type and version, device type, operating system, pages you view, the dates and
          times of your visits, and the website from which you arrived. This information is collected
          through cookies, web beacons, and similar technologies, as described further in Section 5 below.
        </P>
        <P>
          When you make a payment, your payment card details are processed by our payment service providers.
          We do not store full payment card numbers on our servers. Depending on the payment method used,
          we may receive confirmation of payment and limited details necessary to process your booking.
        </P>
      </Section>

      <Section title="3. How We Use Your Information">
        <P>
          We use the information we collect to provide, maintain, and improve the Services, including to
          process and manage your bookings, confirm reservations, handle payments and refunds, and respond
          to your enquiries and requests.
        </P>
        <P>
          We also use your information to communicate with you about your bookings, to send you updates,
          announcements, and marketing communications where you have opted in to receive them, and to manage
          our relationship with you, including providing customer support and resolving disputes.
        </P>
        <P>
          We use automatically collected information to analyse how the Website is used, to measure the
          effectiveness of our marketing, to detect, prevent, and address technical issues and fraudulent or
          abusive activity, and to improve the performance, security, and usability of the Website and the
          Services.
        </P>
      </Section>

      <Section title="4. Lawful Bases for Processing">
        <P>
          We process your personal information on one or more of the following lawful bases: (a) performance
          of a contract with you, such as when we process a booking or provide a service you have requested;
          (b) our legitimate interests, such as improving our services, managing our operations, and
          protecting the security of our systems, provided that such interests are not overridden by your
          rights and interests; (c) compliance with a legal obligation; and (d) your consent, where we rely
          on consent, which you may withdraw at any time.
        </P>
        <P>
          Where we rely on your consent to process your information, for example to send you marketing
          communications, you may withdraw your consent at any time by using the unsubscribe mechanism in
          any communication you receive or by contacting us at the details set out in Section 14 below.
        </P>
      </Section>

      <Section title="5. Cookies & Tracking Technologies">
        <P>
          The Website uses cookies and similar technologies to collect information about your browsing
          activity and to remember your preferences. Cookies are small text files stored on your device
          when you visit a website. They help us make the Website work properly, improve your experience,
          and understand how visitors use our site.
        </P>
        <P>
          We use both session cookies, which expire when you close your browser, and persistent cookies,
          which remain on your device until they expire or you delete them. These may include strictly
          necessary cookies, functional cookies, analytics cookies, and advertising cookies.
        </P>
        <P>
          You can control and manage cookies through your browser settings. Most browsers allow you to
          block or delete cookies; however, if you disable certain cookies, some features of the Website
          may not function properly. For more information about managing cookies, you can consult the help
          section of your browser.
        </P>
      </Section>

      <Section title="6. How We Share Your Information">
        <P>
          We do not sell, rent, or trade your personal information to third parties. We share your
          information only in the limited circumstances described below.
        </P>
        <P>
          We share information with service providers who help us operate the Services, including payment
          processors, cloud hosting providers, analytics providers, and email or communication services.
          These service providers are authorised to use your information only as necessary to provide
          services to us and are subject to appropriate confidentiality and security obligations.
        </P>
        <P>
          We may disclose your information where required to do so by law, regulation, legal process, or
          governmental request, or where we believe in good faith that disclosure is necessary to protect
          our rights, your safety, or the safety of others, or to investigate, prevent, or take action
          regarding suspected illegal activities or fraud.
        </P>
        <P>
          In the event of a merger, acquisition, restructuring, or sale of all or a portion of our assets,
          your information may be transferred as part of that transaction. We will provide notice before
          your information is transferred and becomes subject to a different privacy policy.
        </P>
      </Section>

      <Section title="7. Data Retention">
        <P>
          We retain your personal information only for as long as necessary to fulfil the purposes for which
          it was collected, including to provide the Services, comply with our legal obligations, resolve
          disputes, and enforce our agreements.
        </P>
        <P>
          The retention period for specific categories of information may vary depending on applicable laws,
          accounting requirements, and the nature of the information. When we no longer need your personal
          information, we will delete it or anonymise it in a manner designed to ensure it can no longer be
          associated with you.
        </P>
      </Section>

      <Section title="8. Data Security">
        <P>
          We take reasonable and appropriate technical and organisational measures to protect your personal
          information against unauthorised access, alteration, disclosure, or destruction. These measures
          include secure data storage, access controls, and encryption of data in transit where appropriate.
        </P>
        <P>
          However, no method of transmission over the internet or method of electronic storage is completely
          secure. While we strive to protect your personal information, we cannot guarantee its absolute
          security. In the event of a data breach that affects your personal information, we will comply
          with applicable law regarding notification.
        </P>
      </Section>

      <Section title="9. Your Rights & Choices">
        <P>
          Depending on your jurisdiction, you may have certain rights regarding your personal information,
          including the right to access, correct, update, or delete your information, the right to restrict
          or object to certain processing, the right to data portability, and the right to withdraw consent
          where processing is based on consent.
        </P>
        <P>
          You may also choose whether to receive marketing communications from us. You can opt out at any
          time by following the unsubscribe instructions included in such communications or by contacting us
          directly.
        </P>
        <P>
          To exercise any of these rights, please contact us using the details provided in Section 14 below.
          We will respond to your request within a reasonable timeframe and in accordance with applicable
          law. We may need to verify your identity before processing certain requests.
        </P>
      </Section>


      <Section title="10. Third-Party Services">
        <P>
          The Website may include content, tools, or links provided by third parties, such as mapping
          services (for example, Google Maps), social media platforms (for example, Instagram and
          WhatsApp), and analytics providers. These third parties may collect information about you when
          you use their services.
        </P>
        <P>
          For example, when you use our “Get Directions” feature, Google may process location information in
          accordance with Google&apos;s Privacy Policy. When you contact us via WhatsApp or Instagram, those
          platforms may process your information in accordance with their own privacy policies.
        </P>
        <P>
          We are not responsible for the privacy practices of third-party services. We encourage you to
          review the privacy policies of any third-party service before providing your information to them.
        </P>
      </Section>

      <Section title="11. Children&apos;s Privacy">
        <P>
          Our Services are not directed to children under the age of 13, and we do not knowingly collect
          personal information from children under 13. If you are a parent or guardian and you believe your
          child has provided us with personal information, please contact us, and we will take steps to
          delete such information.
        </P>
        <P>
          Children between the ages of 13 and 17 may use our Services only under the supervision of a parent,
          guardian, or other responsible adult, and any personal information provided in connection with such
          use should be provided by the responsible adult.
        </P>
      </Section>

      <Section title="12. International Data Transfers">
        <P>
          We primarily store and process your information within India. Depending on the service providers
          we use, some information may be transferred to, and processed in, countries other than the country
          in which you reside.
        </P>
        <P>
          Where such transfers occur, we take appropriate measures to ensure that your personal information
          receives an adequate level of protection, including through the use of appropriate contractual
          safeguards, in accordance with applicable data protection laws.
        </P>
      </Section>

      <Section title="13. Changes to This Policy">
        <P>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
          legal requirements, or other factors. When we make changes, we will update the “Last updated” date
          at the top of this page.
        </P>
        <P>
          We encourage you to review this Privacy Policy periodically to stay informed about how we collect,
          use, and protect your information. Your continued use of the Services after any changes are posted
          constitutes your acceptance of the revised policy.
        </P>
      </Section>

      <Section title="14. Contact Us">
        <P>
          If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of
          your personal information, please contact us at:
        </P>
        <div className="space-y-1 text-sm text-go-off/60">
          <p>Game On Multi Sports Complex</p>
          <p>Sports Cube Campus, Sector 70, Gurugram, Haryana 122101, India</p>
          <p>Email: info@gameonmultisports.com</p>
          <p>Phone: +91 90348 44654 (Mon–Sat, 9 AM – 8 PM)</p>
        </div>
        <P>
          We will make reasonable efforts to respond to your enquiry within a reasonable period of time.
        </P>
      </Section>
    </LegalPageShell>
  );
}


