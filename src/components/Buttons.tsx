import { Link, useLocation } from "react-router";
import { BackArrow } from './Arrows';

import up from '@/assets/chevron-up-outline.svg';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from "react";
import { ServerList } from "./ServerList";

interface LinkProps {
    color?: string;
    size?: number;
}

type Icons = 'up'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode,
    size?: number;
    uppercase?: boolean;
    bold?: boolean;
    onHover?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

type IconButtonProps = Omit<ButtonProps, 'children'> & {
    icon: Icons
}

const ICONS: Record<Icons, string> = {
    up
};

export const TextButton = ({ uppercase = false, bold = false, onHover, children, size = 24, ...props }: ButtonProps) => (
    <button
        style={{ fontSize: size }}
        onMouseOver={onHover || props.onMouseOver}
        className={`transition-all ${uppercase ? 'uppercase' : ''} ${bold ? 'font-bold' : ''} disabled:text-gray-500 disabled:pointer-events-none disabled:drop-shadow-[0_1.2px_1.2px_#000] duration-200 hover:scale-105 hover:[text-shadow:1px_1px_5px_white] focus-visible:[outline:none]`}
        {...props}
    >{children}</button>
);

export const IconButton = ({ icon, size = 24, ...props }: IconButtonProps) => {
    return (
        <TextButton size={size} {...props}>
            <img className="invert" src={ICONS[icon]} width={size} height={size} />
        </TextButton>
    );
};

export const BackButton = ({ color = '#FFF', size = 30 }: LinkProps) => {
    const { state } = useLocation();

    return state?.prevURL && (
        <Link to={state.prevURL} target="_self" className="my-5" style={{ color }} >
            <BackArrow width={size} height={size} />
        </Link>
    );
};

export const PlayButton = () => {

    const [isActive, setIsActive] = useState(true);
    const [percentage, setPercentage] = useState(0);

    const handlePlay = useCallback(() => {
        setIsActive(false);
        window.electronAPI.play();
    }, []);

    useEffect(() => {
        const unsubscribe =
            window.electronAPI.onDownloadProgress((_, progress) => {
                setPercentage(progress);

                if (progress === 100) {
                    setIsActive(true);
                }
            });

        return () => unsubscribe;
    }, []);

    return (
        <AnimatePresence mode="wait">
            {
                isActive
                    ? (
                        <motion.section
                            key="active"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.4,
                                ease: "easeInOut",
                            }}
                            className="flex items-center"
                        >
                            <TextButton
                                size={28}
                                uppercase
                                bold
                                disabled={!isActive}
                                onClick={handlePlay}
                            >
                                <span>Jugar</span>
                            </TextButton>
                            <ServerList />
                        </motion.section>
                    )
                    : (
                        <motion.progress
                            key="progress"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.4,
                                ease: "easeInOut",
                            }}
                            className="
										appearance-none 
										w-28
										h-2
										mb-2
										rounded-full 
										overflow-hidden 
										[&::-webkit-progress-bar]:bg-slate-300 
										[&::-webkit-progress-value]:bg-white
										[&::-webkit-progress-value]:transition-[width]
										[&::-webkit-progress-value]:duration-500
									"
                            value={percentage}
                            max={100}
                        />
                    )
            }
        </AnimatePresence>
    );
};