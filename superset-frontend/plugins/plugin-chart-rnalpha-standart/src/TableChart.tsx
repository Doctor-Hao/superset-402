
import React, { useEffect, createRef, useState } from 'react';
import {
  DataRecord,
} from '@superset-ui/core';
import { TableChartTransformedProps } from './types';
import {
  DataTableProps,
} from './DataTable';

import Styles from './Styles';


export default function TableChart<D extends DataRecord = DataRecord>(
  props: TableChartTransformedProps<D> & {
    sticky?: DataTableProps<D>['sticky'];
  },
) {
  const {
    data, height, width,
  } = props;
  const rootElem = createRef<HTMLDivElement>();


  console.log("columns", data)


  return (
    <Styles ref={rootElem} height={height} width={width}>
      <table>
        <thead>
          <th>Шапка</th>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td>
                {row.name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Styles>
  );
}
