import React, { useEffect, useRef } from "react";

interface AutoResizeTextAreaProps {
    value: string | number;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    style?: React.CSSProperties;
}

const AutoResizeTextArea: React.FC<AutoResizeTextAreaProps> = ({ value, onChange, style }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value.toString()}
            onChange={onChange}
            style={{
                width: "100%",
                minHeight: "30px",
                resize: "none",
                overflow: "hidden",
                border: "none",
                outline: "none",
                fontSize: "14px",
                ...style,
            }}
        />
    );
};

export default AutoResizeTextArea;
