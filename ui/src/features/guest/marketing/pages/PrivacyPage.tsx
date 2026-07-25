import { LegalSimplePage } from '@/features/guest/marketing/legal/components/LegalSimplePage';

export function PrivacyPage() {
  return (
    <LegalSimplePage
      title="Privacy Policy"
      description="This policy explains how Kame Homes handles personal information for guests, hosts, and team members."
      sections={[
        {
          title: 'Information we collect',
          paragraphs: [
            'We collect information you provide when creating an account, booking a stay, managing properties, or contacting support. This may include your name, email address, phone number, and booking details.',
            'We also collect technical information such as device type, browser, and usage data to keep the platform secure and improve performance.',
          ],
        },
        {
          title: 'How we use information',
          paragraphs: [
            'We use your information to operate the platform, process bookings, communicate with you, provide customer support, and meet legal obligations.',
            'We do not sell personal information. We share data only with service providers that help us run Kame Homes, such as hosting, email, and payment partners.',
          ],
        },
        {
          title: 'Your choices',
          paragraphs: [
            'You may update account details from your profile or by contacting support. You can also request access, correction, or deletion of personal information where applicable under local law.',
            'If you have questions about this policy, contact us at support@kamehomes.com.',
          ],
        },
      ]}
    />
  );
}
