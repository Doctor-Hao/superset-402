/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useCallback } from 'react';
import { styled } from '@superset-ui/core';

export interface ApiError {
  id: string;
  type: 'load_error' | 'save_error' | 'network_error' | 'validation_error';
  message: string;
  details?: string;
  timestamp: number;
  columnName?: string;
  recordId?: string;
}

interface ApiErrorNotificationsProps {
  errors: ApiError[];
  onDismiss: (errorId: string) => void;
  onDismissAll: () => void;
}

const NotificationsContainer = styled.div`
  margin-bottom: 16px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ErrorItem = styled.div<{ errorType: ApiError['type'] }>`
  padding: 12px 16px;
  border-left: 4px solid ${({ errorType }) => {
    switch (errorType) {
      case 'load_error':
      case 'network_error':
        return '#ff4d4f';
      case 'save_error':
        return '#faad14';
      case 'validation_error':
        return '#1890ff';
      default:
        return '#ff4d4f';
    }
  }};
  background-color: ${({ errorType }) => {
    switch (errorType) {
      case 'load_error':
      case 'network_error':
        return '#fff2f0';
      case 'save_error':
        return '#fffbe6';
      case 'validation_error':
        return '#e6f7ff';
      default:
        return '#fff2f0';
    }
  }};
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

const ErrorIcon = styled.span<{ errorType: ApiError['type'] }>`
  font-size: 16px;
  line-height: 1;
  margin-top: 2px;
  color: ${({ errorType }) => {
    switch (errorType) {
      case 'load_error':
      case 'network_error':
        return '#ff4d4f';
      case 'save_error':
        return '#faad14';
      case 'validation_error':
        return '#1890ff';
      default:
        return '#ff4d4f';
    }
  }};
`;

const ErrorContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ErrorTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  color: #262626;
`;

const ErrorMessage = styled.div`
  font-size: 13px;
  color: #595959;
  line-height: 1.4;
`;

const ErrorDetails = styled.div`
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
`;

const ErrorMeta = styled.div`
  font-size: 11px;
  color: #bfbfbf;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ErrorActions = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #8c8c8c;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1;

  &:hover {
    color: #595959;
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
`;

const ErrorCount = styled.span`
  font-size: 12px;
  color: #8c8c8c;
`;

const ClearAllButton = styled.button`
  background: none;
  border: 1px solid #d9d9d9;
  color: #595959;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;

  &:hover {
    border-color: #40a9ff;
    color: #1890ff;
  }
`;

const getErrorIcon = (type: ApiError['type']): string => {
  switch (type) {
    case 'load_error':
      return '⚠️';
    case 'save_error':
      return '💾';
    case 'network_error':
      return '🌐';
    case 'validation_error':
      return '✏️';
    default:
      return '❌';
  }
};

const getErrorTitle = (type: ApiError['type']): string => {
  switch (type) {
    case 'load_error':
      return 'Failed to load data';
    case 'save_error':
      return 'Failed to save changes';
    case 'network_error':
      return 'Network error';
    case 'validation_error':
      return 'Validation error';
    default:
      return 'Error';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return `${seconds}s ago`;
};

export const ApiErrorNotifications: React.FC<ApiErrorNotificationsProps> = ({
  errors,
  onDismiss,
  onDismissAll,
}) => {
  const handleDismiss = useCallback((errorId: string) => {
    onDismiss(errorId);
  }, [onDismiss]);

  if (errors.length === 0) {
    return null;
  }

  return (
    <NotificationsContainer>
      <HeaderActions>
        <ErrorCount>
          {errors.length} API error{errors.length > 1 ? 's' : ''}
        </ErrorCount>
        <ClearAllButton onClick={onDismissAll}>
          Clear all
        </ClearAllButton>
      </HeaderActions>

      {errors.map((error) => (
        <ErrorItem key={error.id} errorType={error.type}>
          <ErrorIcon errorType={error.type}>
            {getErrorIcon(error.type)}
          </ErrorIcon>
          
          <ErrorContent>
            <ErrorTitle>{getErrorTitle(error.type)}</ErrorTitle>
            <ErrorMessage>{error.message}</ErrorMessage>
            
            {error.details && (
              <ErrorDetails>{error.details}</ErrorDetails>
            )}
            
            <ErrorMeta>
              <span>{formatTimestamp(error.timestamp)}</span>
              {error.columnName && <span>Column: {error.columnName}</span>}
              {error.recordId && <span>ID: {error.recordId}</span>}
            </ErrorMeta>
          </ErrorContent>

          <ErrorActions>
            <ActionButton
              onClick={() => handleDismiss(error.id)}
              title="Dismiss this error"
            >
              ✕
            </ActionButton>
          </ErrorActions>
        </ErrorItem>
      ))}
    </NotificationsContainer>
  );
};

export default ApiErrorNotifications;