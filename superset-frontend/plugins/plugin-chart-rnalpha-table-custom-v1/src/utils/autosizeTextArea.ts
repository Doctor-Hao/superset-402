export function autoResize(element: HTMLTextAreaElement) {
    if (element) {
        element.style.height = 'auto'; // Сбрасываем высоту
        element.style.height = `${element.scrollHeight}px`; // Устанавливаем новую высоту
    }
}
