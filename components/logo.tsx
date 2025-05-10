import Image from "next/image";

export const Logo = ({size = "sm"}: {size?: "sm"|"md"|"lg"}) => {
    const width = {
        sm: 36,
        md: 48,
        lg: 64,
    }[size];
    return (
        <Image src="/nau-colors-logo.svg" alt="智审大师 Logo" width={width} height={width} />
    )
}