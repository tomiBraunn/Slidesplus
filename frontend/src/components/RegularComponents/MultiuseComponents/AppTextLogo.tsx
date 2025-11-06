type AppTextLogoProps = {
    size?: number
}

function AppTextLogo({ size = 100 }: AppTextLogoProps) {
    const projectName: string = "Slides+";
    return (
        <p
            className="appColorFadeText select-none flex items-center justify-center m-0 p-0 leading-none"
            style={{ fontSize: `${size}px` }}
        >
            {projectName}
        </p>
    );
}

export default AppTextLogo;
