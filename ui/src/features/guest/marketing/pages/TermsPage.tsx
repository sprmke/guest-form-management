import { LegalSimplePage } from '@/features/guest/marketing/legal/components/LegalSimplePage';

export function TermsPage() {
  return (
    <LegalSimplePage
      title="Terms of Service"
      description="These terms govern your use of Kame Homes as a guest, host, or organization member."
      sections={[
        {
          title: 'Using the platform',
          paragraphs: [
            'You must provide accurate account information and use Kame Homes only for lawful property management and booking activities.',
            'Hosts are responsible for listing accuracy, guest communication, and compliance with local rental, tax, and safety requirements.',
          ],
        },
        {
          title: 'Bookings and payments',
          paragraphs: [
            'Booking terms, cancellation rules, and payment schedules may vary by property and are shown before confirmation.',
            'Kame Homes provides tools to manage bookings and payments but does not guarantee availability, occupancy, or third-party payment processor uptime.',
          ],
        },
        {
          title: 'Limitation of liability',
          paragraphs: [
            'Kame Homes is provided on an as-is basis to the extent permitted by law. We are not liable for indirect, incidental, or consequential damages arising from platform use.',
            'If you have questions about these terms, contact us at support@kamehomes.com.',
          ],
        },
      ]}
    />
  );
}
