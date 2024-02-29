export const BlurCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <section className={`bg-[#42424281] backdrop:blur-xl rounded-xl ${className}`}>
        {children}
    </section>
)