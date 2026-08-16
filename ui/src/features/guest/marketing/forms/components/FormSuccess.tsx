import { Link } from 'react-router-dom';

import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Building2, FileText, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FormSuccessProps {
  message: string;
  formName: string;
  submissionId?: string;
  propertyId?: string;
  propertyName?: string;
  /** When set, shows a "Track Request" link (e.g. parking broadcast status page). */
  statusUrl?: string;
}

export function FormSuccess({
  message,
  formName: _formName,
  submissionId,
  propertyId,
  propertyName,
  statusUrl,
}: FormSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center"
    >
      {/* Check icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 14 }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50"
      >
        <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
      >
        All done!
      </motion.h1>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground mx-auto mt-3 max-w-sm"
      >
        {message}
      </motion.p>

      {/* Reference number */}
      {submissionId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-border bg-card mt-6 inline-flex items-center gap-2.5 rounded-xl border px-5 py-3"
        >
          <FileText className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-sm">Reference</span>
          <span className="text-foreground font-mono text-sm font-semibold">{submissionId}</span>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
      >
        {statusUrl ? (
          <Button asChild className="w-full gap-2 sm:w-auto" size="lg">
            <Link to={statusUrl}>
              <Clock className="h-4 w-4" />
              Track Request
            </Link>
          </Button>
        ) : (
          propertyId && (
            <Button asChild className="w-full gap-2 sm:w-auto" size="lg">
              <Link to={`/properties/${propertyId}`}>
                <Building2 className="h-4 w-4" />
                {propertyName ?? 'View Property'}
              </Link>
            </Button>
          )
        )}
        <Button
          asChild
          variant={propertyId || statusUrl ? 'outline' : 'default'}
          className="w-full gap-2 sm:w-auto"
          size="lg"
        >
          <Link to="/">
            Back to Home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
