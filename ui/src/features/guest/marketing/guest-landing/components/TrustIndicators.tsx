import { useRef } from 'react';

import { Link } from 'react-router-dom';

import { motion, useInView } from 'framer-motion';
import { Shield, Clock, CreditCard, Headphones, Award, CheckCircle } from 'lucide-react';

const trustItems = [
  {
    icon: Shield,
    title: 'Verified Properties',
    description: 'All listings are verified for quality and authenticity',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Your payment information is always protected',
  },
  {
    icon: Clock,
    title: 'Instant Confirmation',
    description: 'Get booking confirmation within minutes',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our team is here to help anytime you need',
  },
];

const stats = [
  { value: '10K+', label: 'Happy Guests' },
  { value: '1,000+', label: 'Properties' },
  { value: '4.9', label: 'Average Rating' },
  { value: '50+', label: 'Destinations' },
];

export function TrustIndicators() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="from-muted/30 to-background bg-gradient-to-b py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-20 grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-foreground mb-2 text-4xl font-bold lg:text-5xl">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.span>
              </div>
              <p className="text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Features */}
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12 text-center"
          >
            <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
              <Award className="h-4 w-4" />
              Why Choose KameHomes
            </div>
            <h2 className="text-foreground text-3xl font-bold lg:text-4xl">Book with confidence</h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="group"
              >
                <div className="bg-card relative h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="bg-primary/10 text-primary group-hover:bg-primary mb-4 rounded-xl p-3 transition-colors group-hover:text-white"
                    >
                      <item.icon className="h-6 w-6" />
                    </motion.div>
                    <h3 className="text-foreground mb-2 font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative mt-20"
        >
          <div className="from-primary/20 via-primary/10 to-primary/20 absolute inset-0 rounded-3xl bg-gradient-to-r blur-xl" />
          <div className="border-border bg-card relative overflow-hidden rounded-3xl border p-8 shadow-lg lg:p-12 dark:border-0 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="cta-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M 10 0 L 0 0 0 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#cta-grid)" />
              </svg>
            </div>

            <div className="relative flex flex-col items-center justify-between gap-8 lg:flex-row">
              <div className="text-center lg:text-left">
                <h3 className="text-foreground mb-3 text-2xl font-bold lg:text-3xl dark:text-white">
                  Ready to start your adventure?
                </h3>
                <p className="text-muted-foreground max-w-md dark:text-slate-300">
                  Join thousands of happy travelers who have found their perfect vacation rentals
                  with KameHomes.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/properties"
                    className="bg-primary hover:bg-primary/90 shadow-primary/30 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold text-white shadow-lg transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Properties
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/for-hosts"
                    className="border-border bg-muted/80 text-foreground hover:bg-muted inline-flex items-center justify-center gap-2 rounded-full border px-8 py-4 font-semibold transition-colors dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    List Your Property
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
