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
      border: 1px solid transparent;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      word-wrap: break-word;
      white-space: normal;
    }
    
    th {
      font-weight: bold;
    }
  }

  th, td { 
    max-width: 200px
  }

  th p { 
    background-color: white;
    padding: 10px 5px;
    margin: 0 10px;
    box-shadow: 1px 1px 15px rgba(0, 0, 0, 0.25);
  }

  .grey-line {
    position: relative;
    padding: 10px 10px 40px 10px;

    &::before {
      content: '';
      position: absolute;
      bottom: 28px;
      left: 5px;
      width: calc(100% - 10px);
      height: 6px;
      background-color: #999; /* серая линия */
      z-index: 0;
    }  

    * {
      position: relative;
      z-index: 2;
    }
  }

  .grey-line-left {
    position: absolute;
    bottom: 31px;
    left: 5px;
    width: 6px;
    height: 30px;
    background-color: #999;
    z-index: 0;
  }

  .grey-line-right {
    position: absolute;
    bottom: 31px;
    right: 5px;
    width: 6px;
    height: 30px;
    background-color: #999;
    z-index: 0;
  }

  .yellow-line-bottom {
    position: absolute;
    bottom: 8px;
    left: 5px;
    height: 6px;
    width: calc(100% - 10px);
    background-color: #f5c400; 
    z-index: 1;
  }

  .yellow-line-left {
    position: absolute;
    bottom: -22px;
    left: 5px;
    height: 30px;
    width: 6px;
    background-color: #f5c400; 
    z-index: 1;
  }

  .yellow-line-right {
    position: absolute;
    bottom: -22px;
    right: 5px;
    height: 30px;
    width: 6px;
    background-color: #f5c400; 
    z-index: 1;
  }

  .vertical-line {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0px;
      bottom: 0px
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 101%;
      border-left: 4px dashed #f5c400;
      z-index: 0;
    }
  }

  .recommended-column.grey-line{
    background-color: rgb(249, 189, 0); /* жёлтый фон */
    border: 1px solid rgb(249, 189, 0);

  }

  .recommended-column.vertical-line{
    background-color: rgb(249, 189, 0); /* жёлтый фон */
    border: 1px solid rgb(249, 189, 0);

    &::before {
      border-left: 4px dashed #999;
    }  
  }

  .recommended-column .yellow-line-bottom,
  .recommended-column .yellow-line-left,
  .recommended-column  .yellow-line-right{ 
    background-color: #999; 
  }

  tr:nth-of-type(odd) {
  }

  .icon-button.delete {
    color: #f44336;
    background: transparent;
    font-weight: bold;
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
      background: transparent;
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

  .description-footer {
    background: rgb(249, 189, 0);
    padding: 5px 10px;
    display: inline-block;
    margin-top: 10px;
    max-width: 300px;
    width: 100%;
    text-align: center;
    font-weight: bold;
  }

  textarea {
    width: 100%;
    min-height: 40px;
    resize: none;
    border: 1px solid transparent;
    padding: 10px; /* увеличено для центрирования */
    font-size: 14px;
    font-weight: bold; /* жирный текст */
    text-align: center; /* по центру */
    line-height: 1.5;
    box-sizing: border-box;
    display: block;
    overflow: hidden;
    background: white;
    outline: none;
    transition: border 0.2s ease;
    box-shadow: 1px 1px 15px rgba(0, 0, 0, 0.25);

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
