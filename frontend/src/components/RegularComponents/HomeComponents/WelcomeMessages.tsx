// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import TextType from "../../ThirdPartyComponents/TextType/TextType.js";
import { urlbackend } from "../../../config.js";
import { getAuthToken } from '../../../utils/getAuthToken';

type User = {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar?: string;
};

function WelcomeMessages() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fontLoaded, setFontLoaded] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = await getAuthToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${urlbackend}/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, []);
    useEffect(() => {
        const loadFont = async () => {
            try {
                const font = new FontFace(
                    'NType82',
                    'url(/NType82-Headline.otf) format("opentype")'
                );
                await font.load();
                document.fonts.add(font);
                setFontLoaded(true);
                console.log('✅ Fuente NType82 cargada correctamente');
            } catch (error) {
                console.error('❌ Error cargando fuente:', error);
                setFontLoaded(true);
            }
        };

        loadFont();
    }, []);
    const currentMessage = useMemo(() => {
        const firstName = user?.first_name || "there";
        const messages = [
            `sup ${firstName}`,
            "ready to slide?",
            `hey ${firstName}!`,
            "let's create something",
            `welcome back ${firstName}`,
            "time to design",
            "let's get started",
            `what's up ${firstName}?`,
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }, [user?.first_name]);
    if (isLoading || !fontLoaded) {
        return <div className="h-8" />;
    }

    return (
        <div
            className="w-full flex justify-center mt-2 mb-4"
            style={{ fontFamily: 'Playfair Display, NType82, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
            <TextType
                text={currentMessage}
                as="h2"
                className="text-white/60 text-xl tracking-wide"
                typingSpeed={60}
                deletingSpeed={40}
                pauseDuration={2500}
                loop={false}
                showCursor={true}
                cursorCharacter="|"
                cursorClassName="text-white/40"
                hideCursorWhileTyping={false}
                variableSpeed={{ min: 40, max: 80 }}
            />
        </div>
    );
}

export default WelcomeMessages;