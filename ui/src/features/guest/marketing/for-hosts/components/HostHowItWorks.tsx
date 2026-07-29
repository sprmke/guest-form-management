import { motion, useReducedMotion } from 'framer-motion';
import { Building2, CheckCircle2, SlidersHorizontal, Workflow } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Add your property',
    icon: Building2,
  },
  {
    number: '02',
    title: 'Set forms and pricing',
    icon: SlidersHorizontal,
  },
  {
    number: '03',
    title: 'Run the workflow',
    icon: Workflow,
  },
  {
    number: '04',
    title: 'Track every result',
    icon: CheckCircle2,
  },
];

export function HostHowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="bg-muted/30 scroll-mt-24 py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"
        >
          <p className="text-primary mb-3 text-xs font-bold uppercase tracking-[0.2em]">
            How it works
          </p>
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Set it once. Keep every stay moving.
          </h2>
        </motion.div>

        <div className="relative mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <div
            className="bg-border absolute left-[12.5%] right-[12.5%] top-8 hidden h-px lg:block"
            aria-hidden
          />
          {steps.map((step, index) => (
            <motion.article
              key={step.number}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
              className="border-border bg-card relative rounded-2xl border p-5 shadow-sm sm:p-6"
            >
              <div className="bg-primary text-primary-foreground relative z-10 mb-8 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg">
                <step.icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-primary mb-2 text-xs font-black tracking-[0.16em]">
                {step.number}
              </p>
              <h3 className="text-foreground text-lg font-bold">{step.title}</h3>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
