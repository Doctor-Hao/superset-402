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
