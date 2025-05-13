// styles.ts
import { styled } from '@superset-ui/core';

export const Styles = styled.div<{ height: number; width: number }>`
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  overflow: auto; /* Добавляем скроллинг при переполнении */

 .custom-select {
    position: relative;
    width: 150px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    background: white;
    cursor: pointer;
}

.selected-option {
    display: flex;
    align-items: center;
}

.options {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    z-index: 10;
}

.option {
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.option:hover {
    background: #f0f0f0;
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

.icon-button.add {
    color: green;
    font-weight: bold;
}

.icon-button.delete {
    color: red;
    font-weight: bold;
}
  
.icon-button.delete-risk {
    color: red;
    font-weight: bold;
    font-size: 18px;
    margin: 0 auto;
}

input, select, textarea {
    background: none;
    border: none;
    outline: none;
    font-size: 14px;
    width: 100%;
    padding: 5px;
    transition: background 0.2s ease-in-out, border 0.2s ease-in-out;
}

/* При наведении */
input:hover, select:hover, textarea:hover {
    background: rgba(0, 0, 0, 0.05); /* Лёгкий серый фон */
}

/* При фокусе (когда кликнули) */
input:focus, select:focus, textarea:focus {
    border-bottom: 1px solid blue; /* Подчёркивание */
    background: rgba(0, 0, 255, 0.1); /* Светло-синий фон */
}

/* Ячейка флага */
.flag-cell {
    cursor: pointer;
    text-align: center;
    width: 40px;
    height: 100%;
    transition: background 0.2s ease-in-out, opacity 0.2s ease-in-out;
}

/* Hover на флаг (🚩) и пустую ячейку */
.flag-cell:hover {
    background: rgba(255, 0, 0, 0.1); /* Лёгкий красный фон */
    border-radius: 4px;
}


/* Кнопка "Редактировать" */
.icon-button.edit {
    margin: 0 0 10px auto;
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


/* Контейнер для кнопок редактирования */
.group-buttons {
    display: flex;
    gap: 10px;
    margin-top: 5px;
}

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
  min-height: 20px;
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
