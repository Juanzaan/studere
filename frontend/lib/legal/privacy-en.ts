import type { LegalDoc } from "./types";

export const privacyEn: LegalDoc = {
  lang: "en",
  title: "Privacy Policy",
  updatedLabel: "Last updated",
  updated: "2026-08-14",
  intro:
    "This policy explains what data is processed when you use Studere, where it is stored, who it is shared with and what rights you have. It is governed by Uruguay's Law N.º 18.331 on Personal Data Protection, its implementing Decree 414/009 and complementary rules.",
  sections: [
    {
      id: "controller",
      heading: "1. Data controller",
      paragraphs: [
        "The data controller is [legal name of the operator], with registered address at [city], Uruguay, and contact at [contact email].",
      ],
    },
    {
      id: "data-processed",
      heading: "2. What data is processed",
      paragraphs: ["We process the following categories of data:"],
      list: [
        "Account data: email, name and authentication method, provided through Clerk.",
        "Study content: audio recordings, transcripts, notes and images uploaded by the User, processed transiently to generate study material.",
        "Study statistics: quiz and flashcard attempts, stored solely on the User's device.",
        "Payment data: processed exclusively by the payment processor; we neither receive nor store card data.",
      ],
      afterList: [
        "We do not use third-party analytics, tracking pixels, or sell or share personal data for advertising purposes.",
      ],
    },
    {
      id: "storage",
      heading: "3. Where data is stored",
      paragraphs: [
        "The application is local-first: study data is stored in the User's browser local storage (localStorage) and is not uploaded to Studere servers, except as needed for AI processing.",
        "Audio, transcripts and images are sent transiently to Azure OpenAI (Microsoft) for processing and are not persistently stored as part of the Service.",
        "Account data is managed by Clerk, which acts as a data processor.",
      ],
    },
    {
      id: "processors",
      heading: "4. Data processors",
      paragraphs: ["We use the following processors:"],
      list: [
        "Clerk (authentication and account data).",
        "Microsoft Azure OpenAI (transcription and AI content generation).",
        "[Name of the payment processor, to be confirmed] (subscription billing).",
      ],
    },
    {
      id: "cookies",
      heading: "5. Cookies and similar technologies",
      paragraphs: [
        "The application does not use tracking or third-party cookies. Clerk may issue the technical cookies required to maintain the authentication session. Local storage is not used to track the User off-site.",
      ],
    },
    {
      id: "rights",
      heading: "6. User rights (ARCO)",
      paragraphs: [
        "Law N.º 18.331 grants the User the rights of access, rectification, cancellation (deletion) and opposition regarding their personal data. The User may exercise them by writing to [contact email], with proper identification.",
        "We will respond within the legal deadlines. If you believe your rights have been violated, you may file a complaint with the Uruguayan data protection authority (URCDP).",
      ],
    },
    {
      id: "retention",
      heading: "7. Data retention",
      paragraphs: [
        "Study data remains on the User's device until the User deletes it or clears browser data. Content sent for AI processing is kept only as long as needed to complete processing, and the backend cache is transient and content-addressed (it does not contain User identity).",
        "Account data is kept while the account is active and removed when the User cancels it, in line with Clerk's retention periods.",
      ],
    },
    {
      id: "transfers",
      heading: "8. International transfers",
      paragraphs: [
        "Processors may operate outside Uruguay (for example, Clerk and Microsoft Azure). Uruguay holds an adequacy decision from the European Union, and these processors provide equivalent contractual and technical safeguards for data transfers.",
      ],
    },
    {
      id: "security",
      heading: "9. Security",
      paragraphs: [
        "We apply appropriate technical and organizational measures: encryption in transit (HTTPS), authentication token verification and data minimization. Because the primary data lives on the User's device, we recommend keeping the browser and operating system up to date.",
      ],
    },
    {
      id: "minors",
      heading: "10. Minors",
      paragraphs: [
        "The Service is intended for people over 18. Minors under 18 may only use it under the supervision of a responsible adult.",
      ],
    },
    {
      id: "changes",
      heading: "11. Changes",
      paragraphs: [
        "This policy may be updated to reflect changes in the Service or in the law. Changes will be published on this page with the update date.",
      ],
    },
    {
      id: "contact",
      heading: "12. Contact",
      paragraphs: [
        "Privacy questions: [contact email]. Complaints: URCDP, urcdp.gub.uy.",
      ],
    },
  ],
};