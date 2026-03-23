import logoSvg from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "h-8 w-8" }: LogoProps) => {
  return <img src={logoSvg} alt="BibleLands Explorer" className={className} />;
};

export default Logo;
