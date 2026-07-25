import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AbstractBackground } from '@/features/guest/marketing/shared/components/AbstractBackground';

export function ForHostsPage() {
  return (
    <>
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
        <AbstractBackground />

        <div className="container relative z-10 mx-auto px-4 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <span className="border-border bg-muted/80 text-foreground/90 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-sm dark:border-white/20 dark:bg-white/10 dark:text-white/90">
                <Sparkles className="text-primary h-4 w-4" />
                Start your hosting journey
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl dark:text-white"
            >
              Manage your properties
              <br />
              <span className="from-primary to-primary bg-gradient-to-r via-teal-300 bg-clip-text text-transparent">
                with ease
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg sm:text-xl dark:text-white/70"
            >
              Streamline bookings, guest forms, payments, and more. Everything you need to run your
              rental business in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col justify-center gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 shadow-primary/30 h-14 rounded-full px-8 font-semibold text-white shadow-lg"
                asChild
              >
                <Link to="/for-hosts/login">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border bg-muted/80 text-foreground hover:bg-muted h-14 rounded-full px-8 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                asChild
              >
                <Link to="/for-hosts">View Pricing</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-background py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <span className="bg-primary/10 text-primary mb-4 inline-block rounded-full px-3 py-1 text-sm font-medium">
              Platform Features
            </span>
            <h2 className="text-foreground mb-4 text-3xl font-bold lg:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Powerful tools designed specifically for property hosts and managers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calendar,
                title: 'Booking Management',
                description:
                  'Manage all your reservations in one place with our intuitive calendar.',
              },
              {
                icon: Users,
                title: 'Guest Forms',
                description: 'Custom guest forms to collect all the information you need.',
              },
              {
                icon: DollarSign,
                title: 'Payment Tracking',
                description: 'Track income, expenses, and see your profits at a glance.',
              },
              {
                icon: Building2,
                title: 'Multi-Property',
                description: 'Manage multiple properties and switch between them easily.',
              },
              {
                icon: BarChart3,
                title: 'Analytics',
                description: 'Insights and reports to help you grow your business.',
              },
              {
                icon: Shield,
                title: 'Secure & Reliable',
                description: 'Bank-level security to keep your data safe.',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="bg-primary/10 mb-4 w-fit rounded-xl p-3">
                  <feature.icon className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-foreground mb-6 text-3xl font-bold lg:text-4xl">
              Ready to simplify your property management?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join hundreds of hosts who trust KameHomes to manage their properties. Start free,
              upgrade when you&apos;re ready.
            </p>
            <div className="mb-8 flex flex-wrap justify-center gap-4">
              {['No credit card required', 'Free forever for 1 property', 'Cancel anytime'].map(
                (item) => (
                  <div key={item} className="text-muted-foreground flex items-center gap-2 text-sm">
                    <CheckCircle className="text-primary h-4 w-4" />
                    {item}
                  </div>
                )
              )}
            </div>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-primary/30 h-14 rounded-full px-8 font-semibold text-white shadow-lg"
              asChild
            >
              <Link to="/for-hosts/login">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
