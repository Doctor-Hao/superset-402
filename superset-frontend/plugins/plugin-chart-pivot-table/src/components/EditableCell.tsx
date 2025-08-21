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
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { styled } from '@superset-ui/core';
import { ExternalColumnConfig } from '../types';

interface EditableCellProps {
  value: string;
  column: ExternalColumnConfig;
  onSave: (newValue: string) => Promise<void>;
  isLoading?: boolean;
}

const CellContainer = styled.div`
  position: relative;
  min-height: 24px;
  width: 100%;
  
  &:hover .edit-button {
    opacity: 1;
  }
`;

const EditableInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  border: 1px solid ${props => props.hasError ? '#ff4d4f' : '#d9d9d9'};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  outline: none;
  
  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

const DisplayValue = styled.div<{ isEditable?: boolean }>`
  padding: 4px 8px;
  min-height: 20px;
  cursor: ${props => props.isEditable ? 'pointer' : 'default'};
  border-radius: 4px;
  position: relative;
  
  &:hover {
    background-color: ${props => props.isEditable ? '#f5f5f5' : 'transparent'};
  }
`;

const EditButton = styled.button`
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 10px;
  color: #1890ff;
  padding: 2px 4px;
  
  &:hover {
    background-color: #e6f7ff;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 4px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #ff4d4f;
  font-size: 11px;
  margin-top: 2px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'default' }>`
  padding: 2px 8px;
  border: 1px solid ${props => props.variant === 'primary' ? '#1890ff' : '#d9d9d9'};
  background: ${props => props.variant === 'primary' ? '#1890ff' : '#fff'};
  color: ${props => props.variant === 'primary' ? '#fff' : '#333'};
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  column,
  onSave,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const validateInput = useCallback((inputValue: string): string => {
    const { validation } = column;
    if (!validation) return '';

    if (validation.required && !inputValue.trim()) {
      return 'This field is required';
    }

    if (validation.minLength && inputValue.length < validation.minLength) {
      return `Minimum length is ${validation.minLength}`;
    }

    if (validation.maxLength && inputValue.length > validation.maxLength) {
      return `Maximum length is ${validation.maxLength}`;
    }

    if (validation.pattern && !new RegExp(validation.pattern).test(inputValue)) {
      return 'Invalid format';
    }

    return '';
  }, [column]);

  const handleStartEdit = useCallback(() => {
    if (!column.editable || isLoading) return;
    setIsEditing(true);
    setEditValue(value);
    setError('');
  }, [column.editable, isLoading, value]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError('');
  }, [value]);

  const handleSave = useCallback(async () => {
    const validationError = validateInput(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, validateInput, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSave, handleCancelEdit]);

  if (!column.editable) {
    return (
      <DisplayValue>
        {isLoading && <LoadingSpinner />}
        {value || column.defaultValue || '—'}
      </DisplayValue>
    );
  }

  if (isEditing) {
    return (
      <CellContainer>
        <EditableInput
          ref={inputRef}
          type={column.inputType || 'text'}
          value={editValue}
          placeholder={column.placeholder}
          hasError={!!error}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ActionButtons>
          <ActionButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !!error}
          >
            {isSaving ? <LoadingSpinner /> : 'Save'}
          </ActionButton>
          <ActionButton onClick={handleCancelEdit} disabled={isSaving}>
            Cancel
          </ActionButton>
        </ActionButtons>
      </CellContainer>
    );
  }

  return (
    <CellContainer>
      <DisplayValue isEditable onClick={handleStartEdit}>
        {isLoading && <LoadingSpinner />}
        {value || column.defaultValue || '—'}
        <EditButton className="edit-button">✎</EditButton>
      </DisplayValue>
    </CellContainer>
  );
};

export default EditableCell;