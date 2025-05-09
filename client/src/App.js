import React, { useEffect, useState } from "react";
import { useTable } from "react-table";
import "./App.css";
// 四捨五入
function roundDecimal(value, n) {
  return Math.round(value * Math.pow(10, n)) / Math.pow(10, n);
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


  function getYYMMDDStr(date) {
    let d = date ? date : new Date();
    let yymmddstr =
      d.getFullYear().toString().substring(2) +
      (d.getMonth() + 1).toString().padStart(2, "0") +
      d.getDate().toString().padStart(2, "0");
    // if (!pastId) setPastId(yymmddstr);
    return yymmddstr;
  }
  const getDbRec = (kind) => {
    console.log(pastId);
    const params = { cond: kind, pastId: pastId };
    const query = new URLSearchParams(params);
    // console.log("kind:" + kind);
    fetch(`${url}?${query}`, { method: "GET" })
      .then((res) => res.json())
      .then((recs) => {
        setData(recs);
        setSize(recs.length);
        let columns = [];
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
        });
        // console.log(columns);
        setColumns(columns);
      })
      .catch((err) => {
        console.log(err);
        console.log("err");
      });
    // キューに登録済みのマシンの取得
    const params2 = { cond: "queuedMachines"};
    const query2 = new URLSearchParams(params2);
    fetch(`${url}?${query2}`, { method: "GET" })
      .then((res) => res.json())
      .then((recs) => {
        setMachines(recs);
      })
      .catch((err) => {
        console.log(err);
        console.log("err");
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
    "gen",
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
    "dmy",
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
  return (
    <div className="App" style={{ padding: "10px 20px" }}>
      <div style={{ padding: "10px", overflow: "auto" }}>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psTotal1")}>
          summaryTotal1
        </button>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psTotal2")}>
          summaryTotal2
        </button>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psDiff1")}>
          summaryDiff1
        </button>
        <button className="btn btn-sm me-1 btn-primary" style={{ float: "left" }} onClick={() => getDbRec("psDiff2")}>
          summaryDiff2
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
      </div>
      <div style={{ padding: "0px 10PX", overflow: "auto" }} className="row align-items-center">
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
        <div className="input-group mb-3 col"></div>
      </div>
      <div style={{ padding: "0px 20px","flex-wrap": "wrap" }} className="row">
        <div className="col">全 {size} 件</div>
        {machines.map(machine => (
          <div className="col"><span className="badge bg-secondary">{machine}</span></div>
        ))}
      </div>
      <div style={{ padding: "0px 20px", overflow: "auto", maxHeight: "525px" }}>
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
      </div>
    </div>
  );
}

export default App;
