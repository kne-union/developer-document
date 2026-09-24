import React from 'react';
import dayjs from 'dayjs';

/**
 * Map SQL / Sequelize describeTable type string to a form field kind.
 * @param {string} type
 * @returns {'boolean'|'number'|'textarea'|'json'|'datetime'|'date'|'text'}
 */
export const classifySqlType = type => {
  const t = String(type || '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (/\b(boolean|bool|bit)\b/.test(t) || t === 'tinyint(1)') {
    return 'boolean';
  }
  if (/\bjsonb?\b/.test(t)) {
    return 'json';
  }
  if (/\b(timestamp|timestamptz|datetime)\b/.test(t)) {
    return 'datetime';
  }
  if (/\bdate\b/.test(t) && !/\btime\b/.test(t)) {
    return 'date';
  }
  if (/\b(int|integer|bigint|smallint|serial|bigserial|decimal|numeric|real|double|float|money)\b/.test(t)) {
    return 'number';
  }
  if (/\b(text|citext|clob|longtext|mediumtext)\b/.test(t)) {
    return 'textarea';
  }
  const varchar = t.match(/character varying\((\d+)\)/) || t.match(/varchar\((\d+)\)/);
  if (varchar && Number(varchar[1]) > 255) {
    return 'textarea';
  }
  return 'text';
};

/**
 * Column is required for insert/update when NOT NULL and no DB default.
 * @param {{ allowNull?: boolean, defaultValue?: * }} col
 */
export const isColumnRequired = col => {
  if (!col || col.allowNull !== false) {
    return false;
  }
  const d = col.defaultValue;
  if (d != null && d !== '') {
    return false;
  }
  return true;
};

/**
 * Explicit width for ant Table fixed/scroll alignment (every column needs width).
 * @param {{ name?: string, type?: string }} col
 */
export const estimateColumnWidth = col => {
  const name = String(col?.name || '');
  const kind = classifySqlType(col?.type);
  if (kind === 'boolean') {
    return Math.max(100, name.length * 10 + 40);
  }
  if (kind === 'datetime') {
    return 200;
  }
  if (kind === 'date') {
    return 140;
  }
  if (kind === 'number') {
    return 120;
  }
  if (kind === 'textarea' || kind === 'json') {
    return 240;
  }
  const t = String(col?.type || '').toLowerCase();
  const m = t.match(/varying\((\d+)\)/) || t.match(/varchar\((\d+)\)/);
  if (m) {
    const n = Number(m[1]);
    if (n <= 64) {
      return Math.max(180, name.length * 10 + 48);
    }
    if (n <= 128) {
      return 200;
    }
    return 220;
  }
  return Math.max(140, Math.min(240, name.length * 12 + 48));
};

/**
 * Prepare record values for FormInfo (DatePicker needs dayjs).
 * @param {object} record
 * @param {Array<{ name: string, type?: string }>} columns
 */
export const prepareFormRecord = (record, columns) => {
  if (!record) {
    return {};
  }
  const next = { ...record };
  (columns || []).forEach(col => {
    const kind = classifySqlType(col.type);
    const value = next[col.name];
    if (value == null || value === '') {
      return;
    }
    if ((kind === 'date' || kind === 'datetime') && !dayjs.isDayjs(value)) {
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        next[col.name] = parsed;
      }
    }
    if (kind === 'json' && typeof value === 'object') {
      try {
        next[col.name] = JSON.stringify(value, null, 2);
      } catch (e) {
        next[col.name] = String(value);
      }
    }
  });
  return next;
};

/**
 * Normalize form values before save API (dayjs → SQL string, etc.).
 * @param {object} formData
 * @param {Array<{ name: string, type?: string }>} columns
 */
export const normalizeFormPayload = (formData, columns) => {
  const payload = { ...(formData || {}) };
  (columns || []).forEach(col => {
    const kind = classifySqlType(col.type);
    const value = payload[col.name];
    if (value == null || value === '') {
      return;
    }
    if (kind === 'date' || kind === 'datetime') {
      if (typeof value?.format === 'function') {
        payload[col.name] = kind === 'date' ? value.format('YYYY-MM-DD') : value.format('YYYY-MM-DD HH:mm:ss');
      } else if (dayjs.isDayjs(value)) {
        payload[col.name] = kind === 'date' ? value.format('YYYY-MM-DD') : value.format('YYYY-MM-DD HH:mm:ss');
      }
    }
    if (kind === 'json' && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        try {
          payload[col.name] = JSON.parse(trimmed);
        } catch (e) {
          // keep raw string; DB may reject
        }
      }
    }
  });
  return payload;
};

/**
 * Build a FormInfo field for a DB column.
 */
export const createColumnField = ({ FormInfo, col, disabled, forceRequired }) => {
  const { Input, TextArea, InputNumber, DatePicker, Switch: FormSwitch } = FormInfo.fields;
  const kind = classifySqlType(col.type);
  const required = forceRequired != null ? forceRequired : isColumnRequired(col);
  const rule = required ? 'REQ' : '';
  const common = {
    key: col.name,
    name: col.name,
    label: col.name,
    rule,
    disabled: !!disabled
  };

  switch (kind) {
    case 'boolean':
      return <FormSwitch {...common} />;
    case 'number':
      return <InputNumber {...common} style={{ width: '100%' }} />;
    case 'textarea':
    case 'json':
      return <TextArea {...common} autoSize={{ minRows: 2, maxRows: 8 }} />;
    case 'datetime':
      return <DatePicker {...common} showTime style={{ width: '100%' }} />;
    case 'date':
      return <DatePicker {...common} style={{ width: '100%' }} />;
    default:
      return <Input {...common} />;
  }
};

/**
 * Build TablePage filter.list items from column meta (by SQL type).
 * Skips soft-delete & json columns. Number/date use range filters.
 *
 * @param {Array<{ name: string, type?: string }>} columns
 * @param {string} softField
 * @param {object} filterFields Filter.fields
 * @param {(desc: {id: string}) => string} formatMessage
 */
export const buildColumnFilterList = (columns, softField, filterFields, formatMessage) => {
  const { InputFilterItem, DateRangePickerFilterItem, TypeDateRangePickerFilterItem, NumberRangeFilterItem, SuperSelectFilterItem } = filterFields || {};
  // 优先 TypeDateRange（筛选栏标准区间）；否则 DateRangePicker；禁止回落到单日 DatePicker
  const DateRangeItem = TypeDateRangePickerFilterItem || DateRangePickerFilterItem;
  if (!InputFilterItem) {
    return [];
  }
  return (columns || [])
    .filter(col => col?.name && col.name !== softField)
    .map(col => {
      const kind = classifySqlType(col.type);
      const name = col.name;
      const label = col.name;
      if (kind === 'json') {
        return null;
      }
      if (kind === 'boolean' && SuperSelectFilterItem) {
        return {
          type: SuperSelectFilterItem,
          props: {
            name,
            label,
            single: true,
            options: [
              { value: true, label: formatMessage({ id: 'common.yes' }) },
              { value: false, label: formatMessage({ id: 'common.no' }) }
            ]
          }
        };
      }
      if ((kind === 'date' || kind === 'datetime') && DateRangeItem) {
        return {
          type: DateRangeItem,
          props: {
            name,
            label,
            format: 'YYYY-MM-DD'
          }
        };
      }
      if (kind === 'number' && NumberRangeFilterItem) {
        return {
          type: NumberRangeFilterItem,
          props: { name, label }
        };
      }
      return {
        type: InputFilterItem,
        props: {
          name,
          label,
          placeholder: name
        }
      };
    })
    .filter(Boolean);
};

const normalizeRangeBound = (raw, kind, bound) => {
  if (raw == null || raw === '') {
    return undefined;
  }
  if (kind === 'number') {
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
    return undefined;
  }
  if (kind === 'date' || kind === 'datetime') {
    const d = dayjs(raw);
    if (!d.isValid()) {
      return undefined;
    }
    if (kind === 'date') {
      return d.format('YYYY-MM-DD');
    }
    if (bound === 'end' && d.hour() === 0 && d.minute() === 0 && d.second() === 0) {
      return d.endOf('day').format('YYYY-MM-DD HH:mm:ss');
    }
    if (bound === 'start' && d.hour() === 0 && d.minute() === 0 && d.second() === 0) {
      return d.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    }
    return d.format('YYYY-MM-DD HH:mm:ss');
  }
  return raw;
};

/**
 * TablePage mapFilterValue → GET query.filter JSON for dbops.listRows.
 * Equality for text/boolean; `{ $gte, $lte }` for number/date ranges.
 * @param {array} filterValue
 * @param {Array<{ name: string, type?: string }>} columns
 * @param {function} getFilterValue Filter.getFilterValue
 */
export const mapDbRowsFilterValue = (filterValue, columns, getFilterValue) => {
  const raw = (typeof getFilterValue === 'function' ? getFilterValue(filterValue) : filterValue) || {};
  const colMap = new Map((columns || []).map(col => [col.name, col]));
  const filter = {};
  Object.keys(raw).forEach(name => {
    const col = colMap.get(name);
    if (!col) {
      return;
    }
    let v = raw[name];
    if (v == null || v === '') {
      return;
    }
    const kind = classifySqlType(col.type);
    if (kind === 'number' || kind === 'date' || kind === 'datetime') {
      // NumberRange: [min, max]
      // DateRangePicker: [start, end]
      // TypeDateRangePicker: { type, value: [start, end] }
      let start;
      let end;
      if (Array.isArray(v)) {
        start = v[0];
        end = v[1];
      } else if (v && typeof v === 'object' && Array.isArray(v.value)) {
        start = v.value[0];
        end = v.value[1];
      } else {
        const point = normalizeRangeBound(v, kind, 'start');
        if (point === undefined) {
          return;
        }
        filter[name] = point;
        return;
      }
      const gte = normalizeRangeBound(start, kind, 'start');
      const lte = normalizeRangeBound(end, kind, 'end');
      if (gte === undefined && lte === undefined) {
        return;
      }
      const range = {};
      if (gte !== undefined) {
        range.$gte = gte;
      }
      if (lte !== undefined) {
        range.$lte = lte;
      }
      filter[name] = range;
      return;
    }
    if (Array.isArray(v)) {
      if (!v.length) {
        return;
      }
      v = v[0];
    }
    if (kind === 'boolean') {
      if (v === true || v === 1 || v === '1' || v === 'true') {
        v = true;
      } else if (v === false || v === 0 || v === '0' || v === 'false') {
        v = false;
      }
    }
    filter[name] = v;
  });
  return {
    filter: Object.keys(filter).length ? JSON.stringify(filter) : null
  };
};
