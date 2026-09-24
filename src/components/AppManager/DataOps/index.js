import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Drawer, Empty, Space, Switch, Tag, Typography, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { createWithRemoteLoader } from '@kne/remote-loader';
import withLocale from '@root/withLocale';
import { useIntl } from '@kne/react-intl';
import Fetch from '@kne/react-fetch';
import style from './style.module.scss';
import { createColumnField, estimateColumnWidth, isColumnRequired, normalizeFormPayload, prepareFormRecord, buildColumnFilterList, mapDbRowsFilterValue } from './dbColumnForm';

const { Text } = Typography;
const SECRET_MASK = '********';

const DB_DIALECT_OPTIONS = [
  { value: 'postgres', label: 'postgres' },
  { value: 'mysql', label: 'mysql' },
  { value: 'mariadb', label: 'mariadb' },
  { value: 'sqlite', label: 'sqlite' },
  { value: 'mssql', label: 'mssql' }
];

const DB_FIELD_META = [{ name: 'DB_HOST' }, { name: 'DB_PORT' }, { name: 'DB_DATABASE' }, { name: 'DB_USERNAME' }, { name: 'DB_PASSWORD' }, { name: 'DB_STORAGE', placeholder: 'sqlite path' }];

/** Add/edit row fields: PK can opt into snowflake auto-generate via Switch. */
const RowEditorForm = ({ FormInfo, columns, pk, isEdit, formatMessage }) => {
  const { Switch: FormSwitch } = FormInfo.fields;
  const [autoGen, setAutoGen] = useState(() => {
    const init = {};
    if (!isEdit) {
      pk.forEach(col => {
        init[col] = true;
      });
    }
    return init;
  });

  const list = [];
  if (!isEdit) {
    pk.forEach(colName => {
      const col = columns.find(c => c.name === colName) || { name: colName, allowNull: false };
      list.push(<FormSwitch key={`auto-${colName}`} name={`__auto_${colName}`} label={formatMessage({ id: 'appManager.db.autoGenerateId' }, { field: colName })} onChange={value => setAutoGen(prev => ({ ...prev, [colName]: !!value }))} />);
      if (!autoGen[colName]) {
        list.push(createColumnField({ FormInfo, col, forceRequired: true }));
      }
    });
  }
  columns.forEach(col => {
    if (!isEdit && pk.includes(col.name)) {
      return;
    }
    list.push(
      createColumnField({
        FormInfo,
        col,
        disabled: !!isEdit && pk.includes(col.name),
        forceRequired: pk.includes(col.name) && !isEdit ? true : undefined
      })
    );
  });

  return <FormInfo column={1} list={list} />;
};

const DbConfigForm = ({ FormInfo, formatMessage, initialDialect }) => {
  const { Input: FormInput, Select: FormSelect } = FormInfo.fields;
  const [dialect, setDialect] = useState(() => initialDialect || '');

  return (
    <FormInfo
      column={1}
      list={[
        <FormSelect key="DB_DIALECT" name="DB_DIALECT" label="DB_DIALECT" allowClear options={DB_DIALECT_OPTIONS} placeholder={formatMessage({ id: 'appManager.db.dialectPlaceholder' })} onChange={value => setDialect(value || '')} />,
        ...(dialect === 'sqlite'
          ? [<FormInput key="DB_STORAGE" name="DB_STORAGE" label="DB_STORAGE" placeholder="sqlite path" />]
          : dialect
            ? DB_FIELD_META.filter(f => f.name !== 'DB_STORAGE').map(({ name }) => <FormInput key={name} name={name} label={name} />)
            : [])
      ]}
    />
  );
};

const DataOps = createWithRemoteLoader({
  modules: ['components-core:Global@usePreset', 'components-core:FormInfo', 'components-core:TablePage', 'components-core:TablePage@Table', 'components-core:Filter', 'components-thirdparty:CodeEditor']
})(
  withLocale(({ remoteModules, data, onSuccess }) => {
    const [usePreset, FormInfo, TablePage, Table, Filter, CodeEditor] = remoteModules;
    const { ajax, apis } = usePreset();
    const { useFormModal } = FormInfo;
    const formModal = useFormModal();
    const { message, modal } = App.useApp();
    const { formatMessage } = useIntl();

    const [selectedTable, setSelectedTable] = useState(null);
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [tableSort, setTableSort] = useState([]);
    const [queryOpen, setQueryOpen] = useState(false);
    const [querySql, setQuerySql] = useState('SELECT * FROM ');
    const [queryResult, setQueryResult] = useState(null);
    const [queryHistory, setQueryHistory] = useState([]);
    const [queryRunning, setQueryRunning] = useState(false);
    const [restartHint, setRestartHint] = useState(false);

    const tableRef = useRef(null);
    const queryResultRef = useRef(null);
    const pageListRef = useRef([]);
    const primaryKeyRef = useRef([]);
    const tableSortRef = useRef([]);
    const dataRef = useRef(data);
    dataRef.current = data;
    queryResultRef.current = queryResult;
    const appName = data?.name;
    const appEnv = data?.env || {};
    const historyKey = `app-manager-sql-history:${appName || 'unknown'}`;

    const resolveRowKey = useCallback(record => {
      if (!record) {
        return '';
      }
      const pk = primaryKeyRef.current || [];
      if (pk.length === 1) {
        return String(record[pk[0]]);
      }
      if (pk.length > 1) {
        return pk.map(k => String(record[k])).join('\0');
      }
      if (record.id != null) {
        return String(record.id);
      }
      return JSON.stringify(record);
    }, []);

    // table-view 的 rowKey 函数须返回字段路径（lodash get），不能返回主键值；统一写入 __rowKey
    const { selectedRows, selectedRowKeys, getRowSelection, setSelectedRowKeys, clearSelectedRows } = Table.useSelectedRow({ rowKey: '__rowKey' });

    const { sortRender } = Table.useSort({
      sort: tableSort,
      onSortChange: next => {
        const newSort = Array.isArray(next) ? next : [];
        tableSortRef.current = newSort;
        setTableSort(newSort);
        // TablePage 有 filter 时 reload 会走 buildRequestParamsWithFilter；
        // 列名若与 name/table/sort 冲突会被清成 null，须在 mapFilterValue 里回写固定参数
        tableRef.current?.reload?.({
          params: {
            currentPage: 1,
            sort: newSort.length ? JSON.stringify(newSort) : null
          }
        });
      }
    });

    const rowSelection = useMemo(() => {
      const base = getRowSelection(pageListRef.current);
      return Object.assign({}, base, {
        onChange: keys => {
          setSelectedRowKeys(keys, pageListRef.current);
        }
      });
    }, [getRowSelection, setSelectedRowKeys, selectedTable, includeDeleted]);

    const reloadParent = useCallback(() => {
      onSuccess && onSuccess();
    }, [onSuccess]);

    const readHistory = useCallback(() => {
      try {
        const raw = localStorage.getItem(historyKey);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.slice(0, 10) : [];
      } catch (e) {
        return [];
      }
    }, [historyKey]);

    const writeHistory = useCallback(
      list => {
        const next = (list || []).slice(0, 10);
        localStorage.setItem(historyKey, JSON.stringify(next));
        setQueryHistory(next);
      },
      [historyKey]
    );

    const pushHistory = useCallback(
      sql => {
        const text = String(sql || '').trim();
        if (!text) {
          return;
        }
        const prev = readHistory().filter(item => item.sql !== text);
        writeHistory([{ sql: text, at: Date.now() }, ...prev]);
      },
      [readHistory, writeHistory]
    );

    useEffect(() => {
      clearSelectedRows();
      tableSortRef.current = [];
      setTableSort([]);
    }, [selectedTable, includeDeleted, clearSelectedRows]);

    useEffect(() => {
      tableRef.current?.reload?.({
        params: {
          currentPage: 1,
          sort: null
        }
      });
    }, [selectedTable, includeDeleted]);

    useEffect(() => {
      if (queryOpen) {
        setQueryHistory(readHistory());
      }
    }, [queryOpen, readHistory]);

    const openRowEditor = (rowMeta, record) => {
      const pk = rowMeta?.primaryKey || [];
      const softField = rowMeta?.softDeleteField || 'deleted_at';
      const columns = (rowMeta?.columns || []).filter(col => col.name !== softField);
      const isEdit = !!record;
      const defaultData = prepareFormRecord(record || {}, columns);
      if (!isEdit) {
        pk.forEach(col => {
          defaultData[`__auto_${col}`] = true;
        });
      }
      formModal({
        title: isEdit ? formatMessage({ id: 'appManager.db.editRow' }) : formatMessage({ id: 'appManager.db.addRow' }),
        size: 'small',
        formProps: {
          data: defaultData,
          onSubmit: async formData => {
            const autoGenerate = {};
            let payload = normalizeFormPayload(formData, columns);
            if (!isEdit) {
              pk.forEach(col => {
                const flagKey = `__auto_${col}`;
                const raw = payload[flagKey];
                delete payload[flagKey];
                // Form Switch 默认勾选时可能不进 submit；仅显式 false 视为手填
                const auto = !(raw === false || raw === 0 || raw === 'false');
                autoGenerate[col] = auto;
                if (auto) {
                  delete payload[col];
                }
              });
            }
            const { data: resData } = await ajax(
              Object.assign({}, apis.appManager.dbRowSave, {
                data: {
                  name: appName,
                  table: selectedTable,
                  data: payload,
                  ...(Object.keys(autoGenerate).length ? { autoGenerate } : {})
                }
              })
            );
            if (resData.code !== 0) {
              return false;
            }
            message.success(formatMessage({ id: 'common.saveSuccess' }));
            tableRef.current?.reload?.();
          }
        },
        children: <RowEditorForm FormInfo={FormInfo} columns={columns} pk={pk} isEdit={isEdit} formatMessage={formatMessage} />
      });
    };

    const softDeleteRows = (rows, reload) => {
      if (!rows?.length) {
        message.warning(formatMessage({ id: 'appManager.db.selectRowFirst' }));
        return;
      }
      const pkFields = primaryKeyRef.current || [];
      modal.confirm({
        title: formatMessage({ id: 'appManager.db.softDeleteTitle' }),
        content: formatMessage({ id: 'appManager.db.softDeleteConfirm' }, { count: rows.length }),
        onOk: async () => {
          for (const item of rows) {
            const pk = {};
            (item.__primaryKey || pkFields).forEach(k => {
              pk[k] = item[k];
            });
            const { data: resData } = await ajax(
              Object.assign({}, apis.appManager.dbRowRemove, {
                data: { name: appName, table: selectedTable, pk }
              })
            );
            if (resData.code !== 0) {
              return;
            }
          }
          message.success(formatMessage({ id: 'appManager.db.softDeleteSuccess' }));
          clearSelectedRows();
          if (typeof reload === 'function') {
            reload();
          } else {
            tableRef.current?.reload?.();
          }
        }
      });
    };

    const restoreRows = (rows, reload) => {
      if (!rows?.length) {
        message.warning(formatMessage({ id: 'appManager.db.selectRowFirst' }));
        return;
      }
      const pkFields = primaryKeyRef.current || [];
      modal.confirm({
        title: formatMessage({ id: 'appManager.db.restore' }),
        content: formatMessage({ id: 'appManager.db.restoreConfirm' }),
        onOk: async () => {
          for (const item of rows) {
            const pk = {};
            (item.__primaryKey || pkFields).forEach(k => {
              pk[k] = item[k];
            });
            const { data: resData } = await ajax(
              Object.assign({}, apis.appManager.dbRowRestore, {
                data: { name: appName, table: selectedTable, pk }
              })
            );
            if (resData.code !== 0) {
              return;
            }
          }
          message.success(formatMessage({ id: 'appManager.db.restoreSuccess' }));
          clearSelectedRows();
          if (typeof reload === 'function') {
            reload();
          } else {
            tableRef.current?.reload?.();
          }
        }
      });
    };

    const openQuery = (defaultSql = 'SELECT * FROM ') => {
      setQuerySql(defaultSql);
      setQueryResult(null);
      setQueryHistory(readHistory());
      setQueryOpen(true);
    };

    const runQuery = async () => {
      const sql = String(querySql || '').trim();
      if (!sql) {
        message.warning(formatMessage({ id: 'appManager.db.queryEmpty' }));
        return;
      }
      setQueryRunning(true);
      try {
        const { data: resData } = await ajax(
          Object.assign({}, apis.appManager.dbQuery, {
            data: { name: appName, sql }
          })
        );
        if (resData.code !== 0) {
          setQueryResult(null);
          return;
        }
        pushHistory(sql);
        setQueryResult({
          ...resData.data,
          at: Date.now()
        });
      } finally {
        setQueryRunning(false);
      }
    };

    const clearQueryHistory = () => {
      writeHistory([]);
      message.success(formatMessage({ id: 'appManager.db.queryHistoryCleared' }));
    };

    const openDbConfig = () => {
      const allKeys = ['DB_DIALECT', ...DB_FIELD_META.map(f => f.name)];
      const draft = {};
      allKeys.forEach(name => {
        draft[name] = appEnv[name] == null ? '' : String(appEnv[name]);
      });
      const initialDialect = draft.DB_DIALECT || '';
      formModal({
        title: formatMessage({ id: 'appManager.db.configureDb' }),
        size: 'small',
        formProps: {
          data: draft,
          onSubmit: async formData => {
            const dialect = String(formData.DB_DIALECT ?? '').trim();
            const patch = {};
            allKeys.forEach(name => {
              patch[name] = null;
            });
            if (dialect) {
              patch.DB_DIALECT = dialect;
              if (dialect === 'sqlite') {
                const storage = String(formData.DB_STORAGE ?? '').trim();
                patch.DB_STORAGE = storage || null;
                if (storage) {
                  patch.DB_HOST = storage;
                }
              } else {
                ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'].forEach(name => {
                  const val = String(formData[name] ?? '').trim();
                  if (!val) {
                    patch[name] = null;
                    return;
                  }
                  if (name === 'DB_PASSWORD' && val === SECRET_MASK) {
                    patch[name] = SECRET_MASK;
                    return;
                  }
                  patch[name] = val;
                });
              }
            }
            const { data: resData } = await ajax(
              Object.assign({}, apis.appManager.saveEnv, {
                data: { name: appName, env: patch }
              })
            );
            if (resData.code !== 0) {
              return false;
            }
            message.success(formatMessage({ id: 'appManager.db.dbConfigSaved' }));
            setRestartHint(true);
            reloadParent();
          }
        },
        children: <DbConfigForm FormInfo={FormInfo} formatMessage={formatMessage} initialDialect={initialDialect} />
      });
    };

    const restartApp = async () => {
      const { data: resData } = await ajax(
        Object.assign({}, apis.appManager.restart, {
          data: { name: appName }
        })
      );
      if (resData.code !== 0) {
        return;
      }
      message.success(formatMessage({ id: 'appManager.actions.restartSuccess' }));
      setRestartHint(false);
      reloadParent();
    };

    const connectionLabel = useMemo(() => {
      const dialect = appEnv.DB_DIALECT;
      const database = appEnv.DB_DATABASE || appEnv.DB_STORAGE;
      if (dialect || database) {
        return [dialect, database].filter(Boolean).join(' · ');
      }
      return null;
    }, [appEnv]);

    return (
      <Fetch
        {...Object.assign({}, apis.appManager.dbTables, {
          params: { name: appName }
        })}
        render={({ data: tablesData, reload: reloadTables }) => {
          const pageData = tablesData?.pageData || [];
          const metaMap = {};
          pageData.forEach(item => {
            metaMap[item.table] = {
              ...item,
              softDeleteField: tablesData?.softDeleteField || 'deleted_at'
            };
          });
          const selectedMeta = selectedTable ? metaMap[selectedTable] : null;
          if (selectedMeta) {
            primaryKeyRef.current = selectedMeta.primaryKey || [];
          }
          const softField = selectedMeta?.softDeleteField || tablesData?.softDeleteField || 'deleted_at';
          const filterColumns = selectedMeta?.columns || [];
          const filterList = selectedMeta ? buildColumnFilterList(filterColumns, softField, Filter.fields, formatMessage) : [];
          const tableFilter = {
            list: filterList,
            displayLine: 1,
            mapFilterValue: value => {
              // 必须回写 name/table/sort/keyword 等 API 固定参数：TablePage 会把筛选项同名 key 清成 null
              const sort = tableSortRef.current;
              const flat = Filter.getFilterValue(value) || {};
              const keyword = flat.keyword != null && String(flat.keyword).trim() !== '' ? String(flat.keyword).trim() : null;
              return Object.assign(
                {
                  name: appName,
                  table: selectedTable,
                  includeDeleted: includeDeleted || null,
                  sort: sort.length ? JSON.stringify(sort) : null,
                  keyword
                },
                mapDbRowsFilterValue(value, filterColumns, Filter.getFilterValue)
              );
            }
          };
          const conn = tablesData?.connection || {};
          const scope = tablesData?.dbScope || 'shared';
          const summary = connectionLabel || [conn.dialect, conn.database].filter(Boolean).join(' · ') || formatMessage({ id: 'appManager.db.defaultConnection' });

          return (
            <div className={style['data-ops']}>
              <div className={style['topbar']}>
                <Space size={12} wrap>
                  <DatabaseOutlined />
                  <Text strong>{formatMessage({ id: 'appManager.db.connection' })}</Text>
                  <Tag color={scope === 'dedicated' ? 'purple' : 'blue'}>{scope === 'dedicated' ? formatMessage({ id: 'appManager.db.scopeDedicated' }) : formatMessage({ id: 'appManager.db.scopeShared' })}</Tag>
                  <Text type="secondary" ellipsis style={{ maxWidth: 360 }}>
                    {summary}
                  </Text>
                </Space>
                <Space>
                  <Button size="small" onClick={openDbConfig}>
                    {formatMessage({ id: 'appManager.db.configureDb' })}
                  </Button>
                  {restartHint ? (
                    <Button size="small" type="primary" icon={<SyncOutlined />} onClick={restartApp}>
                      {formatMessage({ id: 'appManager.db.restartToApply' })}
                    </Button>
                  ) : null}
                </Space>
              </div>

              {restartHint ? (
                <Alert className={style['restart-alert']} type="warning" showIcon message={formatMessage({ id: 'appManager.db.restartHint' })} />
              ) : (
                <Alert className={style['restart-alert']} type="info" showIcon message={formatMessage({ id: 'appManager.db.dbConfigHint' })} />
              )}

              <div className={style['workspace']}>
                <aside className={style['sidebar']}>
                  <div className={style['sidebar-head']}>
                    <Text strong>{formatMessage({ id: 'appManager.db.tables' })}</Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        reloadTables();
                        reloadParent();
                      }}
                    />
                  </div>
                  {!pageData.length ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'appManager.db.noTables' })} />
                  ) : (
                    <ul className={style['table-nav']}>
                      {pageData.map(item => (
                        <li key={item.table} className={item.table === selectedTable ? style['table-nav-active'] : undefined} onClick={() => setSelectedTable(item.table)}>
                          <span className={style['table-icon']} />
                          <span className={style['table-name']} title={item.table}>
                            {item.table}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>

                <section className={style['main-pane']}>
                  {selectedTable && selectedMeta ? (
                    <>
                      <div className={style['toolbar']}>
                        <Space wrap>
                          <Button size="small" icon={<ReloadOutlined />} onClick={() => tableRef.current?.reload?.()}>
                            {formatMessage({ id: 'common.refresh' })}
                          </Button>
                          <Button size="small" type="primary" icon={<PlusOutlined />} disabled={!selectedMeta.primaryKey?.length} onClick={() => openRowEditor(selectedMeta, null)}>
                            {formatMessage({ id: 'appManager.db.addRow' })}
                          </Button>
                          <Button size="small" icon={<SearchOutlined />} onClick={() => openQuery(`SELECT * FROM ${selectedTable} LIMIT 100`)}>
                            {formatMessage({ id: 'appManager.db.queryTitle' })}
                          </Button>
                        </Space>
                        <Space>
                          <Text type="secondary">{formatMessage({ id: 'appManager.db.showDeleted' })}</Text>
                          <Switch size="small" checked={includeDeleted} onChange={setIncludeDeleted} />
                        </Space>
                      </div>

                      <div className={style['grid']}>
                        <TablePage
                          {...Object.assign({}, apis.appManager.dbRows)}
                          ref={tableRef}
                          name={`app-db-rows-v3-${appName}-${selectedTable}-${includeDeleted ? 1 : 0}`}
                          params={{
                            name: appName,
                            table: selectedTable,
                            includeDeleted: includeDeleted || undefined,
                            sort: tableSort.length ? JSON.stringify(tableSort) : undefined
                          }}
                          pagination={{ paramsType: 'params' }}
                          filter={tableFilter}
                          search={{
                            name: 'keyword',
                            label: formatMessage({ id: 'common.keyword' }),
                            placeholder: formatMessage({ id: 'appManager.db.keywordPlaceholder' })
                          }}
                          rowKey="__rowKey"
                          rowSelection={rowSelection}
                          selectedRows={selectedRows}
                          sortRender={sortRender}
                          batchActions={[
                            {
                              key: 'batch-soft-delete',
                              label: formatMessage({ id: 'appManager.db.batchSoftDelete' }),
                              danger: true,
                              onClick: ({ selectedRows: rows, reload }) => {
                                softDeleteRows(rows, reload);
                              }
                            },
                            ...(includeDeleted
                              ? [
                                  {
                                    key: 'batch-restore',
                                    label: formatMessage({ id: 'appManager.db.batchRestore' }),
                                    onClick: ({ selectedRows: rows, reload }) => {
                                      restoreRows(rows, reload);
                                    }
                                  }
                                ]
                              : [])
                          ]}
                          dataFormat={data => {
                            const list = (data.pageData || []).map(item => Object.assign({}, item, { __rowKey: resolveRowKey(item) }));
                            pageListRef.current = list;
                            return {
                              list,
                              total: data.totalCount ?? data.total
                            };
                          }}
                          columns={[
                            ...(selectedMeta.columns || []).map(col => ({
                              name: col.name,
                              width: estimateColumnWidth(col),
                              ellipsis: true,
                              sort: { single: true },
                              title: (
                                <div className={style['col-title']}>
                                  <span className={style['col-name']}>
                                    {col.name}
                                    {isColumnRequired(col) ? (
                                      <span className={style['col-req']} title={formatMessage({ id: 'appManager.db.columnRequired' })}>
                                        *
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className={style['col-type']}>{String(col.type || '').toLowerCase()}</span>
                                </div>
                              ),
                              getValueOf: item => (item[col.name] == null ? '' : String(item[col.name]))
                            })),
                            {
                              name: 'options',
                              title: formatMessage({ id: 'appManager.version.actions' }),
                              renderType: 'options',
                              fixed: 'right',
                              width: 140,
                              getValueOf: item => {
                                const pk = {};
                                (selectedMeta.primaryKey || []).forEach(k => {
                                  pk[k] = item[k];
                                });
                                const softFieldName = selectedMeta.softDeleteField || softField;
                                const isDeleted = item[softFieldName] != null && item[softFieldName] !== '';
                                if (isDeleted) {
                                  return [
                                    {
                                      children: formatMessage({ id: 'appManager.db.restore' }),
                                      onClick: () => {
                                        restoreRows([
                                          Object.assign({}, item, {
                                            __primaryKey: selectedMeta.primaryKey || []
                                          })
                                        ]);
                                      },
                                      disabled: !selectedMeta.primaryKey?.length
                                    }
                                  ];
                                }
                                return [
                                  {
                                    children: formatMessage({ id: 'common.edit' }),
                                    onClick: () => openRowEditor(selectedMeta, item),
                                    disabled: !selectedMeta.primaryKey?.length
                                  },
                                  {
                                    children: formatMessage({ id: 'appManager.db.softDelete' }),
                                    isDelete: true,
                                    message: formatMessage({ id: 'appManager.db.softDeleteConfirm' }, { count: 1 }),
                                    onClick: async () => {
                                      const { data: resData } = await ajax(
                                        Object.assign({}, apis.appManager.dbRowRemove, {
                                          data: { name: appName, table: selectedTable, pk }
                                        })
                                      );
                                      if (resData.code === 0) {
                                        message.success(formatMessage({ id: 'appManager.db.softDeleteSuccess' }));
                                        clearSelectedRows();
                                        tableRef.current?.reload?.();
                                      }
                                    },
                                    disabled: !selectedMeta.primaryKey?.length
                                  }
                                ];
                              }
                            }
                          ]}
                        />
                      </div>
                    </>
                  ) : (
                    <div className={style['empty-main']}>
                      <Empty description={formatMessage({ id: 'appManager.db.selectTable' })} />
                    </div>
                  )}
                </section>
              </div>

              <Drawer
                title={formatMessage({ id: 'appManager.db.queryTitle' })}
                width={820}
                open={queryOpen}
                onClose={() => setQueryOpen(false)}
                destroyOnClose={false}
                extra={
                  <Button type="primary" loading={queryRunning} onClick={runQuery}>
                    {formatMessage({ id: 'appManager.db.runQuery' })}
                  </Button>
                }
              >
                <Text type="secondary">{formatMessage({ id: 'appManager.db.queryHint' })}</Text>
                <div className={style['sql-editor']}>
                  <CodeEditor
                    height={260}
                    defaultLanguage="sql"
                    value={querySql}
                    onChange={value => setQuerySql(value == null ? '' : String(value))}
                    options={{
                      fontSize: 13,
                      wordWrap: 'on',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true
                    }}
                  />
                </div>

                <div className={style['sql-history']}>
                  <div className={style['sql-history-head']}>
                    <Text strong>{formatMessage({ id: 'appManager.db.queryHistory' })}</Text>
                    <Button type="link" size="small" disabled={!queryHistory.length} onClick={clearQueryHistory}>
                      {formatMessage({ id: 'appManager.db.queryHistoryClear' })}
                    </Button>
                  </div>
                  {!queryHistory.length ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={formatMessage({ id: 'appManager.db.queryHistoryEmpty' })} />
                  ) : (
                    <ul className={style['sql-history-list']}>
                      {queryHistory.map(item => (
                        <li key={`${item.at}-${item.sql.slice(0, 24)}`}>
                          <button type="button" className={style['sql-history-item']} onClick={() => setQuerySql(item.sql)} title={formatMessage({ id: 'appManager.db.queryHistoryLoad' })}>
                            <span className={style['sql-history-sql']}>{item.sql}</span>
                            <span className={style['sql-history-time']}>{item.at ? new Date(item.at).toLocaleString() : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {queryResult ? (
                  <div className={style['sql-result']}>
                    <TablePage
                      key={`query-${queryResult.at || 0}-${(queryResult.columns || []).join(',')}-${queryResult.rowCount || 0}`}
                      name={`app-db-query-${appName}`}
                      pagination={{ pageSize: 20 }}
                      loader={async ({ data: requestData } = {}) => {
                        const rows = queryResultRef.current?.rows || [];
                        const currentPage = Math.max(1, Number(requestData?.currentPage) || 1);
                        const perPage = Math.max(1, Number(requestData?.perPage) || 20);
                        const start = (currentPage - 1) * perPage;
                        return {
                          pageData: rows.slice(start, start + perPage),
                          totalCount: rows.length
                        };
                      }}
                      columns={(queryResult.columns || []).map(col => ({
                        name: col,
                        title: col,
                        getValueOf: item => (item[col] == null ? '' : String(item[col]))
                      }))}
                    />
                  </div>
                ) : null}
                {queryResult?.truncated ? <Alert style={{ marginTop: 8 }} type="warning" message={formatMessage({ id: 'appManager.db.queryTruncated' })} /> : null}
              </Drawer>
            </div>
          );
        }}
      />
    );
  })
);

export default DataOps;
