// styles.ts
import { styled } from '@superset-ui/core';

export const Styles = styled.div<{ height: number; width: number }>`
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  overflow: auto; /* Добавляем скроллинг при переполнении */

  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid black;

    th, td {
      border: 1px solid white;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      word-wrap: break-word;
      white-space: normal;
    }

    th {
      background-color: #f9bd00;
      font-weight: bold;
    }
  }

  tr:nth-of-type(odd) {
    background-color: rgb(226, 226, 226);
  }

  /* Убираем фон и границу у кнопки удаления */
  .icon-button {
      border: none;
      background: none;
      outline: none;
      font-size: 14px;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease-in-out;
  }

  .icon-button:hover {
      opacity: 0.7;
  }

  /* Кнопка "Редактировать" */
  .icon-button.edit {
      background: #f9bd00;
      border: none;
      font-size: 14px;
      color: black;
      cursor: pointer;
      padding: 5px 12px;
      border-radius: 5px;
      transition: background 0.2s ease-in-out, opacity 0.2s ease-in-out;
  }

  /* Hover-эффект */
  .icon-button.edit:hover {
      background: gold;
      opacity: 0.9;
  }

  textarea {
    width: 100%;
    min-height: 40px;
    resize: none;
    border: 1px solid transparent;
    padding: 4px;
    font-size: 14px;
    box-sizing: border-box;
    display: block;
    overflow: hidden;
    background: transparent;
    outline: none;
    transition: border 0.2s ease;

    &:hover {
      border: 1px solid #4CAF50;
      background-color: #f9f9f9;
      cursor: text;
    }
  }

`;

// Стилизованный input для даты
export const StyledDateInput = styled.input`
  width: 150px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: inherit;
  outline: none;
  text-align: center;

  &::-webkit-calendar-picker-indicator {
    filter: invert(1); /* Скрыть иконку календаря */
    opacity: 0;
  }

  &:focus {
    outline: none;
  }
`;

export const StyledTextArea = styled.textarea`
  width: 100%;
  min-height: 40px;
  resize: none; /* По умолчанию ресайз отключён */
  border: none;
  padding: 4px;
  font-size: 14px;
  box-sizing: border-box;
  display: block;
  overflow: hidden;
  background: transparent;
  outline: none;

  &:hover {
    resize: vertical; /* При наведении появляется возможность вертикального ресайза */
  }
`;
