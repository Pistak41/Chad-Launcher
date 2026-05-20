import { motion } from 'framer-motion';

export const Page = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
            duration: 0.25,
        }}
        className="h-full"
    >
        {children}
    </motion.div>
);