import React, { useEffect, useRef } from "react";

interface AutoResizeTextAreaProps {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const AutoResizeTextArea: React.FC<AutoResizeTextAreaProps> = ({ value, onChange }) => {
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
            value={value}
            onChange={onChange}
            style={{
                width: "100%",
                minHeight: "30px",
                resize: "none",
                overflow: "hidden",
                border: "none",
                outline: "none",
                fontSize: "14px",
            }}
        />
    );
};

export default AutoResizeTextArea;
