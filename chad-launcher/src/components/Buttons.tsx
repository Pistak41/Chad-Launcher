import { Link, useLocation } from "react-router-dom";
import { BackArrow } from "./Arrows";

interface LinkProps {
    color?: string;
    size?: number;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode,
    size?: number;
    uppercase?: boolean;
    bold?: boolean;
    onHover?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const TextButton = ({ uppercase = false, bold = false, onHover, children, size = 24, ...props }: ButtonProps) => (
    <button
        style={{ fontSize: size }}
        onMouseOver={onHover || props.onMouseOver}
        className={`transition-all ${uppercase ? 'uppercase' : ''} ${bold ? 'font-bold' : ''} disabled:text-gray-500 disabled:pointer-events-none disabled:drop-shadow-[0_1.2px_1.2px_#000] duration-200 hover:scale-105 hover:[text-shadow:1px_1px_5px_white] focus-visible:[outline:none]`}
        {...props}
    >{children}</button>
)

export const BackButton = ({ color = '#FFF', size = 30 }: LinkProps) => {
    const location = useLocation();

    return location.state?.prevURL && (
        <Link to={location.state.prevURL} className="my-5" style={{ color }} >
            <BackArrow width={size} height={size} />
        </Link>
    )
}