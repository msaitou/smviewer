import React, { useEffect, useState } from "react";
import { useTable } from "react-table";
import "./App.css";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from '@mui/material/styles';
// 四捨五入
function roundDecimal(value, n) {
  return Math.round(value * Math.pow(10, n)) / Math.pow(10, n);
}

function getYYMMDDStr(date) {
  let d = date ? date : new Date();
  let yymmddstr =
    d.getFullYear().toString().substring(2) +
    (d.getMonth() + 1).toString().padStart(2, "0") +
    d.getDate().toString().padStart(2, "0");
  return yymmddstr;
}
function formatTimeWithMillis(ms) {
  if (typeof ms !== 'number' || ms < 0) return '';

  const milliseconds = ms % 1000;
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}
function App() {
  console.log(window.location);
  var url = `http://${window.location.hostname}:3333/`;
  if (window.location.href.indexOf("https") > -1) {
    url = `https://${window.location.hostname}${window.location.pathname}api/`;
  }
  const [data, setData] = useState([]);
  const [size, setSize] = useState([]);
  const [machines, setMachines] = useState([]);
  const [pastId, setPastId] = useState([]);
  const [columns, setColumns] = useState([]);
  const [gcolumns, setGcolumns] = useState([]);


  const getDbRec = (kind) => {
    console.log(pastId);
    const params = { cond: kind, pastId: pastId };
    const query = new URLSearchParams(params);
    // console.log("kind:" + kind);
    fetch(`${url}?${query}`, { method: "GET" })
      .then((res) => res.json())
      .then((recs) => {
        setSize(recs.length);
        let columns = [];
        /**
         * @typedef { import('@mui/x-data-grid').GridColDef } GridColDef
         */
        /** @type {GridColDef[]} */
        let gcolumns = [];
        Object.keys(recs[0]).forEach((key) => {
          columns.push({
            Header: key,
            accessor: key,
            Cell: (row) => {
              if (NUM_COLUMNS.indexOf(key) > -1) return roundDecimal(row.value, 1);
              else if (DATE_COLUMNS.concat(TIME_COLUMNS).indexOf(key) > -1) {
                // console.log("kind:" + kind);
                if (row.value) {
                  let date = new Date(row.value);
                  return kind.indexOf("mq") === 0 && TIME_COLUMNS.indexOf(key) === -1
                    ? `${("00" + date.getHours()).slice(-2)}:${("00" + date.getMinutes()).slice(-2)}`
                    : key != "exec_time"
                      ? date.toLocaleTimeString()
                      : `${new Date(row.value).toISOString().substr(11, 8)}.${String(row.value).slice(-3)}`;
                } else return "-";
              } else return row.value;
            },
            align: NUM_COLUMNS.indexOf(key) > -1 ? "right" : DATE_COLUMNS.indexOf(key) > -1 ? "center" : "left",
          });
          if (!["_id"].includes(key)) {
            let gcolumn = {
              // セルの幅
              field: key,
              headerName: key,
              // flex: 1,
            };
            switch (key) {
              case "total":
              case "exec_time_start":
                gcolumn.width = "80";
                break;
              case "mod_date":
                gcolumn.width = "90";
                break;
              case "main":
                gcolumn.width = "160";
                break;
              case "sub":
                gcolumn.width = "50";
                break;
              case "from":
              case "to":
                gcolumn.width = "60";
                break;
              case "exec_time":
                gcolumn.width = "105";
                break;
              case "machine":
                gcolumn.width = "105";
                break;
              default:
                gcolumn.width = "70";
            }
            if (NUM_COLUMNS.includes(key)) gcolumn.type = "number"; // 右寄席
            else if (["mod_date"].includes(key)) {
              gcolumn.type = "date"; // 日付
              gcolumn.valueGetter =  (params) => {  // 表示用に「値そのもの」を取り出し・変換する
                const value = params;
                if (!value) return "";
                const date = new Date(value);
                return date;
              };
            }
            else if (TIME_COLUMNS.concat(["from", "to"]).includes(key)) {
              gcolumn.type = "datetime"; // 日付
              gcolumn.valueFormatter = (params) => {// 値を取得後、表示向けに文字列化する
                const value = params;
                if (!value) return "";
                if ("exec_time" === key) {  // ミリ秒を表す数値として扱う場合
                  const ms = Number(value);
                  if (isNaN(ms)) return "";
                  return formatTimeWithMillis(ms);
                } else {  // 時間を hh:mm:ss 形式で表示
                  const date = new Date(value);
                  if (isNaN(date)) return "";
                  if (["from", "to"].includes(key)) {
                    return date.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                  } else return date.toLocaleTimeString("ja-JP", { hour12: false });
                }
              };
            }

            gcolumns.push(gcolumn);
          }
        });
        recs.forEach((r, i) => {
          if (r._id)r.id = r._id;
          else r.id = i;  // 添え字
        }); // DateGridは idが必須なのでそのパース
        setData(recs);
        // console.log(columns);
        setColumns(columns);  // 削除予定　TODO
        setGcolumns(gcolumns);
      })
      .catch((err) => {
        console.log(err);
        console.log("err");
      });
    // キューに登録済みのマシンの取得
    const params2 = { cond: "queuedMachines" };
    const query2 = new URLSearchParams(params2);
    fetch(`${url}?${query2}`, { method: "GET" })
      .then((res) => res.json())
      .then((recs) => {
        setMachines(recs);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  // 最初に1回だけ
  useEffect(() => {
    getDbRec("psTotal1");
    // setPastId("230107");
  }, []);
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    columns,
    data,
  });
  const NUM_COLUMNS = [
    "total",
    "diff",
    "gmy",
    "cit",
    "gpo",
    "mop",
    "cms",
    "sug",
    "cri",
    "lfm",
    "pto",
    "pic",
    "pex",
    "pst",
    "pil",
    "ecn",
    "ame",
    "raku",
  ];
  const DATE_COLUMNS = ["mod_date", "from", "to"];
  const TIME_COLUMNS = ["exec_time", "exec_time_start"];
  // default props then custom props
  const combinedHeaderProps = (defaultHeaderProps, { column }) => {
    return [
      defaultHeaderProps,
      generateHeaderStyles(column.align),
      // , column.getSortByToggleProps()
    ];
  };
  const combinedCellProps = (defaultCellProps, { cell }) => {
    return [defaultCellProps, generateCellStyles(cell.column.align, cell.value, cell.column.type, cell.column.Header)];
  };
  // adding column option styles to props
  const generateHeaderStyles = (align) => {
    return {
      style: {
        textAlign: align === "right" ? "right" : align === "center" ? "center" : "left",
        // justifyContent: align === "right" ? "flex-end" : "flex-start",
        // alignItems: "flex-start",
        // display: "flex",
      },
    };
  };
  const generateCellStyles = (align, value, type, header) => {
    let styleObject = {
      color: "currentColor",
      // the cells we actually don't want to be flex
      textAlign: "",
    };
    styleObject.textAlign = align === "right" ? "right" : align === "center" ? "center" : "left";
    // color ACOS data
    if (header === "ACOS") {
      styleObject.color =
        value <= 0.2
          ? "var(--green-dark)"
          : value <= 0.4
            ? "var(--black)"
            : value <= 0.5
              ? "var(--orange-dark)"
              : "var(--red-dark)";
    }
    return {
      style: styleObject,
    };
  };
  const getPastDays = () => {
    let date = new Date();
    let pastDays = [];
    for (let i = 1; i < 10; i++) {
      date.setDate(date.getDate() - 1);
      pastDays.push(getYYMMDDStr(date));
      // if (i==1) setPastId(getYYMMDDStr(date));
    }
    return { list: pastDays, defo: pastDays[0] };
  };
const theme = createTheme({
  components: {
    MuiDataGrid: {
      styleOverrides: {
        columnHeaders: {
          fontWeight: 'bold',
        },
      },
    },
  },
});
  return (
    <div className="App" style={{ padding: "10px 20px" }}>
      {/* 
       {JSON.stringify(data)}
       */}
      {console.log(Array.isArray(data))}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <button className="btn btn-sm btn-primary" onClick={() => getDbRec("psTotal1")}>
          summaryTotal1
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => getDbRec("psDiff1")}>
          summaryDiff1
        </button>
        <button className="btn btn-sm btn-success" onClick={() => getDbRec("mqNotDone")}>
          queNotDone
        </button>
        <button className="btn btn-sm btn-success" onClick={() => getDbRec("mqPast")}>
          quePast
        </button>
        <button className="btn btn-sm btn-success" onClick={() => getDbRec("mqNow")}>
          execNow
        </button>
        <button className="btn btn-sm btn-success" onClick={() => getDbRec("mqDone")}>
          done
        </button>

        <div className="d-flex align-items-center gap-2" style={{ width: "auto", minWidth: 0 }}>
          <select className="form-select form-select-sm" style={{ width: "auto", minWidth: "6rem" }} value={pastId} onChange={(event) => setPastId(event.target.value)}>
            {getPastDays().list.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <button className="btn btn-sm btn-dark" onClick={() => getDbRec("mqhPast")}>
            queHistoryPast
          </button>
          <button className="btn btn-sm btn-dark" onClick={() => getDbRec("mqhPastDone")}>
            queHistoryPastDone
          </button>
        </div>
      </div>
      {/* <div style={{ padding: "10px", overflow: "auto" }}>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psTotal1")}>
          summaryTotal1
        </button>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psDiff1")}>
          summaryDiff1
        </button>
        <button className="btn btn-sm me-1 btn-success" style={{ float: "left" }} onClick={() => getDbRec("mqNotDone")}>
          queNotDone
        </button>
        <button className="btn btn-sm me-1 btn-success" style={{ float: "left" }} onClick={() => getDbRec("mqPast")}>
          quePast
        </button>
        <button className="btn btn-sm me-1 btn-success" style={{ float: "left" }} onClick={() => getDbRec("mqNow")}>
          execNow
        </button>
        <button className="btn btn-sm me-1 btn-success" style={{ float: "left" }} onClick={() => getDbRec("mqDone")}>
          done
        </button>
        <div className="input-group mb-3 col">
          <select className="" value={pastId} onChange={(event) => setPastId(event.target.value)}>
            {getPastDays().list.map((day, i) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <button className="btn btn-sm me-1 btn-dark" onClick={() => getDbRec("mqhPast")}>
            queHistoryPast
          </button>
          <button className="btn btn-sm me-1 btn-dark" onClick={() => getDbRec("mqhPastDone")}>
            queHistoryPastDone
          </button>
        </div>
      </div> */}
      {/* <div style={{ padding: "0px 10PX", overflow: "auto" }} className="row align-items-center">
        <div className="input-group mb-3 col"></div>
      </div> */}
      <div style={{ padding: "0px 20px", "flex-wrap": "wrap" }} className="row">
        <div className="col">全 {size} 件</div>
        {machines.map((machine) => (
          <div className="col">
            <span className="badge bg-secondary">{machine}</span>
          </div>
        ))}
      </div>
      <Box sx={{ height: 480, p: 3 }} theme={theme}>
        <DataGrid
          sx={{
            "--unstable_DataGrid-headWeight": "700", // bold 相当の数値（500や600より大きい値）
          }}
          rows={data}
          columns={gcolumns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          // pageSizeOptions={[5, 10]}
          pageSizeOptions={[10, 100, { value: -1, label: "All" }]} // ページネーションの1ページのサイズの選択肢
          // disableRowSelectionOnClick
        />
      </Box>
      {/* <div style={{ padding: "0px 20px", overflow: "auto", maxHeight: "525px" }}>
        <table className="table" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(combinedHeaderProps)}>{column.render("Header")}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell) => {
                    // console.log(cell);
                    return (
                      <td {...cell.getCellProps(combinedCellProps)} className="text-nowrap">
                        {cell.render("Cell")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(combinedHeaderProps)}>{column.render("Header")}</th>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div> */}
    </div>
  );
}

export default App;
