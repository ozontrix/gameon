import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Use | GAME ON — Premium Sports Destination",
  description:
    "The Terms of Use governing the Game On website, bookings, and use of our multi-sports facilities in Sector 70, Gurugram.",
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

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Use" updated="August 23, 2026">
      <Section title="1. Acceptance of These Terms">
        <P>
          Welcome to Game On Multi Sports Complex (“Game On,” “we,” “us,” or “our”). These Terms of Use
          (“Terms”) constitute a legally binding agreement between you, whether acting as an individual, on
          behalf of a group, or on behalf of an organization, and Game On regarding your access to and use
          of our website at game-on.in (the “Website”), our mobile experiences, our booking and payment
          services, and the facilities, courts, and amenities offered at our premises located at Sports Cube
          Campus, Sector 70, Gurugram, Haryana 122101, India (collectively, the “Services”).
        </P>
        <P>
          By accessing the Website, creating an account, making a booking, purchasing any product or service,
          or otherwise using any part of the Services, you acknowledge that you have read, understood, and
          agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms
          by reference. If you do not agree to these Terms, you must not access the Website or use any of the
          Services.
        </P>
      </Section>

      <Section title="2. About Game On">
        <P>
          Game On is a premium multi-sports destination offering air-conditioned and open-air courts for
          pickleball, badminton, box cricket, football, and cricket nets, along with supporting amenities
          such as changing rooms, a café, and community spaces. We provide an environment designed for players
          of every level — from beginners to professionals — and for families, corporate teams, schools, and
          community groups.
        </P>
        <P>
          Our Services may evolve from time to time. We reserve the right to add, modify, suspend, or
          discontinue any part of the Services, whether in whole or in part, at any time, with or without
          notice to you.
        </P>
      </Section>

      <Section title="3. Eligibility">
        <P>
          You must be at least 18 years of age to create an account, make a booking, or enter into any
          transaction on the Website. If you are between 13 and 17 years of age, you may use the Services
          only under the supervision of a parent, guardian, or other responsible adult who agrees to be
          bound by these Terms and who is responsible for your actions. Individuals under the age of 13 may
          not use the Services.
        </P>
        <P>
          By using the Services, you represent and warrant that all information you provide is accurate,
          current, and complete, and that you have the legal capacity to enter into a binding agreement.
          If you are using the Services on behalf of a company, organization, or other legal entity, you
          represent and warrant that you have the authority to bind that entity to these Terms.
        </P>
      </Section>

      <Section title="4. Website Access & Use">
        <P>
          We grant you a limited, non-exclusive, non-transferable, and revocable right to access and use the
          Website for your personal, non-commercial purposes, subject to your continued compliance with these
          Terms. You agree not to use the Services in any manner that could damage, disable, overburden, or
          impair the Website or interfere with any other party&apos;s use of the Services.
        </P>
        <P>
          You agree not to attempt to gain unauthorized access to any part of the Website, other accounts,
          computer systems, or networks connected to the Services, whether through hacking, password mining,
          or any other means. You further agree not to use any automated means, including bots, scrapers, or
          data-mining tools, to access, collect, or monitor any content from the Website without our prior
          written consent.
        </P>
        <P>
          We may, at our sole discretion, restrict, suspend, or terminate your access to the Website or any
          of the Services at any time and for any reason, including if we reasonably believe that you have
          violated these Terms.
        </P>
      </Section>

      <Section title="5. Bookings, Reservations & Payments">
        <P>
          The Website may allow you to browse available time slots for courts and nets and to reserve such
          slots through our booking flow. All bookings are subject to availability and to the specific terms
          displayed at the time of booking. A booking is confirmed only when you receive a confirmation
          message, whether on screen or by email or other electronic communication.
        </P>
        <P>
          When you make a booking, you may be required to provide certain details, including your name,
          contact information, and payment information. You agree to provide accurate, current, and complete
          information and to promptly update your information as necessary. You are solely responsible for
          all activities that occur under your account or as a result of your bookings.
        </P>
        <P>
          All prices are stated in Indian Rupees (INR) and are inclusive of applicable taxes unless otherwise
          indicated. We reserve the right to change prices at any time without prior notice. Payment must be
          received in full before your booking is considered confirmed unless we expressly agree otherwise in
          writing.
        </P>
        <P>
          In the event of a payment failure, insufficient funds, or any suspected fraudulent activity, we may
          cancel or refuse a booking without liability. We may also require additional verification before
          confirming certain bookings.
        </P>
      </Section>

      <Section title="6. Cancellations & Refunds">
        <P>
          Our cancellation and refund policy is designed to be fair to both you and our community of players.
          If you wish to cancel a booking, you may do so through the channels we make available from time to
          time, and the applicable refund amount, if any, will be determined by the policy in effect at the
          time of your booking.
        </P>
        <P>
          Generally, bookings cancelled a reasonable period in advance may be eligible for a refund, which
          may be subject to administrative charges. Bookings cancelled at short notice, or no-shows, may not
          be eligible for a refund. Promotional, discounted, or package-based bookings may be subject to
          different terms, which will be communicated to you at the time of booking.
        </P>
        <P>
          In the unusual event that we cancel a booking due to circumstances within our control, such as
          facility closure or maintenance, we will offer you a replacement slot or a refund in accordance
          with the policy in effect at that time. We shall not be liable for any indirect or consequential
          losses arising from a cancellation.
        </P>
      </Section>

      <Section title="7. Facility Rules & Code of Conduct">
        <P>
          All visitors, players, and guests are expected to behave with courtesy, respect, and sportsmanship
          at all times while on our premises. We reserve the right to refuse entry, remove any person, or
          terminate a booking if, in our sole judgment, a person&apos;s behaviour endangers the safety of
          others, damages property, or disrupts the enjoyment of other guests.
        </P>
        <P>
          You agree to comply with all posted rules, instructions, and guidance provided by our staff,
          including rules relating to court usage, equipment handling, dress code, hygiene, and safety.
          Suitable sports footwear and appropriate attire must be worn in all playing areas. Outdoor play may
          be affected by weather conditions, and we reserve the right to suspend or cancel play in the
          interest of safety.
        </P>
        <P>
          You are responsible for your own safety and the safety of your belongings while using the
          Services. Sporting activities carry inherent risks, including the risk of injury. By using our
          facilities, you acknowledge and accept these risks and agree to participate responsibly, following
          the instructions of our staff at all times.
        </P>
      </Section>

      <Section title="8. Accounts & Security">
        <P>
          If you create an account, you are responsible for maintaining the confidentiality of your login
          credentials and for all activities that occur under your account. You agree to notify us
          immediately of any unauthorized use of your account or any other breach of security.
        </P>
        <P>
          We are not liable for any loss or damage arising from your failure to safeguard your credentials.
          You may not transfer or assign your account to any other person without our prior written consent.
        </P>
      </Section>


      <Section title="9. Intellectual Property Rights">
        <P>
          The Website, including its text, graphics, logos, images, audio, video, software, and the overall
          look and feel, and all intellectual property rights therein, including copyrights, trademarks,
          service marks, and trade dress, are owned by Game On or its licensors and are protected by
          applicable intellectual property laws.
        </P>
        <P>
          You may not reproduce, distribute, modify, create derivative works of, publicly display, perform,
          republish, download, store, or transmit any content from the Website, except as expressly permitted
          by these Terms or with our prior written permission. Nothing in these Terms grants you any right,
          title, or interest in any of our intellectual property.
        </P>
      </Section>

      <Section title="10. User-Generated Content">
        <P>
          Certain features of the Website, including community and social features such as “The Game On
          Wall,” may allow you to post, upload, or share content, including photographs, comments, captions,
          and other material. You retain all rights in and to your own content.
        </P>
        <P>
          By posting content, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and
          transferable licence to use, reproduce, modify, adapt, publish, distribute, display, and create
          derivative works from such content in connection with operating and promoting the Services. You
          represent and warrant that you own or have the necessary rights to the content you post and that
          such content does not infringe the rights of any third party.
        </P>
        <P>
          We do not pre-screen user content and are not responsible for the content posted by users. However,
          we reserve the right to remove, edit, or refuse to display any content that, in our sole judgment,
          violates these Terms, applicable law, or community standards.
        </P>
      </Section>

      <Section title="11. Prohibited Activities">
        <P>You agree not to use the Services to:</P>
        <ul className="list-disc pl-5 space-y-2">
          <li>Violate any applicable local, state, national, or international law or regulation.</li>
          <li>Post or transmit any unlawful, threatening, abusive, defamatory, obscene, or otherwise objectionable content.</li>
          <li>Harass, abuse, or harm another person, or infringe upon the privacy or rights of others.</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
          <li>Engage in any fraudulent, deceptive, or misleading activity, including making fraudulent bookings.</li>
          <li>Resell, sublet, or transfer bookings or access to the facilities without our written consent.</li>
          <li>Interfere with or disrupt the Services, or attempt to gain unauthorized access to our systems.</li>
          <li>Collect or store personal data about other users without their consent.</li>
        </ul>
        <P>
          We may investigate and take appropriate action against anyone who, in our sole judgment, engages in
          any prohibited activity, including suspending or terminating access and cooperating with law
          enforcement authorities.
        </P>
      </Section>

      <Section title="12. Third-Party Links & Services">
        <P>
          The Website may contain links to third-party websites, applications, and services, including
          payment processors, social media platforms, and mapping services. These links are provided for
          your convenience only. We do not control, endorse, or assume any responsibility for the content,
          policies, or practices of any third-party website or service.
        </P>
        <P>
          Your use of any third-party website or service is subject to the terms and conditions and privacy
          policies of such third parties. We encourage you to review those terms carefully before using any
          third-party service. We shall not be liable for any loss or damage arising from your use of
          third-party services.
        </P>
      </Section>


      <Section title="13. Disclaimers">
        <P>
          To the fullest extent permitted by applicable law, the Services, the Website, and all content and
          materials made available through them are provided on an “as is” and “as available” basis, without
          warranties of any kind, whether express or implied, including implied warranties of
          merchantability, fitness for a particular purpose, non-infringement, accuracy, and completeness.
        </P>
        <P>
          We do not warrant that the Website will be uninterrupted, timely, secure, or error-free, that
          defects will be corrected, or that the Website or the servers that make it available are free of
          viruses or other harmful components. We may temporarily suspend access to the Website or any of
          the Services for maintenance or other operational reasons without prior notice.
        </P>
        <P>
          We do not provide medical or fitness advice. Before beginning any physical activity at our
          facilities, you should consult with a qualified medical professional, particularly if you have any
          pre-existing health condition. You are solely responsible for determining your own fitness and
          readiness to participate in sporting activities.
        </P>
      </Section>

      <Section title="14. Limitation of Liability">
        <P>
          To the fullest extent permitted by applicable law, in no event shall Game On, its affiliates,
          directors, officers, employees, agents, or licensors be liable to you or any third party for any
          indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of
          profits, loss of data, loss of goodwill, personal injury, or property damage, arising out of or in
          connection with your use of the Services, even if we have been advised of the possibility of such
          damages.
        </P>
        <P>
          Our total aggregate liability arising out of or in connection with these Terms or your use of the
          Services shall not exceed the amount you actually paid to us for the specific booking or service
          giving rise to the claim, or INR 10,000, whichever is lower, except where such limitation is
          prohibited by applicable law.
        </P>
        <P>
          You acknowledge and agree that your participation in sporting activities is voluntary and involves
          inherent risks, and you assume full responsibility for any injuries or damages you may sustain as a
          result of such participation, to the fullest extent permitted by law.
        </P>
      </Section>

      <Section title="15. Indemnification">
        <P>
          You agree to indemnify, defend, and hold harmless Game On and its affiliates, directors, officers,
          employees, agents, and licensors from and against any and all claims, liabilities, damages,
          losses, costs, and expenses, including reasonable attorneys&apos; fees, arising out of or in
          connection with your use of the Services, your violation of these Terms, your violation of any
          applicable law, or your violation of the rights of any third party.
        </P>
        <P>
          We reserve the right, at our own expense, to assume the exclusive defence and control of any matter
          otherwise subject to indemnification by you, in which event you agree to cooperate with us in
          asserting any available defences.
        </P>
      </Section>


      <Section title="16. Termination">
        <P>
          We may terminate or suspend your access to the Services, in whole or in part, at any time and for
          any reason, including without limitation if you breach these Terms. Upon termination, your right to
          use the Services ceases immediately, and we may delete or remove any content you have posted without
          liability.
        </P>
        <P>
          All provisions of these Terms which by their nature should survive termination shall survive,
          including without limitation ownership provisions, warranty disclaimers, indemnification, and
          limitations of liability.
        </P>
      </Section>

      <Section title="17. Governing Law & Jurisdiction">
        <P>
          These Terms shall be governed by and construed in accordance with the laws of India, without regard
          to its conflict of law provisions. Any dispute arising out of or in connection with these Terms
          shall first be referred to good-faith negotiations between the parties.
        </P>
        <P>
          If a dispute cannot be resolved through negotiation, it shall be subject to the exclusive
          jurisdiction of the courts of Gurugram, Haryana, India. You irrevocably consent to the jurisdiction
          of such courts and waive any objection to venue or the convenience of such forum.
        </P>
      </Section>

      <Section title="18. Changes to These Terms">
        <P>
          We may update, revise, or replace these Terms from time to time in our sole discretion. When we
          make changes, we will update the “Last updated” date at the top of this page. It is your
          responsibility to review these Terms periodically for changes.
        </P>
        <P>
          Your continued use of the Services following the posting of any changes constitutes acceptance of
          those changes. If you do not agree to the revised Terms, you must stop using the Services.
        </P>
      </Section>

      <Section title="19. Contact Us">
        <P>
          If you have any questions, concerns, or complaints regarding these Terms, the Services, or your
          bookings, please contact us at:
        </P>
        <div className="space-y-1 text-sm text-go-off/60">
          <p>Game On Multi Sports Complex</p>
          <p>Sports Cube Campus, Sector 70, Gurugram, Haryana 122101, India</p>
          <p>Email: info@gameonmultisports.com</p>
          <p>Phone: +91 90348 44654 (Mon–Sat, 9 AM – 8 PM)</p>
        </div>
        <P>
          We will make reasonable efforts to respond to your inquiry within a reasonable period of time.
        </P>
      </Section>
    </LegalPageShell>
  );
}


