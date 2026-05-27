const express = require("express");
const conf = require("config");
const port = 3333;
const app = express();

const D = {
  CODE: {
    CIT: "cit",
    GMY: "gmy",
    PIC: "pic",
    CRI: "cri",
    ECN: "ecn",
    PTO: "pto",
    MOP: "mop",
    PEX: "pex",
    CMS: "cms",
    GPO: "gpo",
    // GEN: "gen",
    SUG: "sug",
    LFM: "lfm",
    PST: "pst",
    PIL: "pil",
    AME: "ame",
    RAKU: "raku",
    // DMY: "dmy",
  },
};
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTION");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.get("/", async (req, res) => {
  let params = req.query;
  // test
  console.log(params);
  // params.cond = "psTotal1";
  params.collection;
  params.method;
  params.limit;
  params.sort;
  let coll,
    method = "find",
    cond = {},
    opt;
  switch (params.cond) {
    case "psTotal1":
    case "psDiff1":
      opt = { limit: 10, sort: { _id: -1 } };
      coll = "point_summary";
      break;
    case "psTotal2":
    case "psDiff2":
      opt = { limit: 30, sort: { _id: -1 } };
      coll = "point_summary";
      break;
    case "mqNotDone": // 今日の未完了ミッションリスト
      opt = { sort: { machine: -1, "valid_time.to": 1, "valid_time.from": 1 } };
      cond = { status: { $ne: "done" } };
      coll = "mission_que";
      break;
    case "mqPast": // 今日の完了しなかったミッションリスト
      opt = { sort: { machine: -1, "valid_time.to": 1, "valid_time.from": 1 } };
      cond = { status: { $ne: "done" }, "valid_time.to": { $lt: new Date() } };
      coll = "mission_que";
      break;
    case "mqhPast": // 過去の完了しなかったミッションリスト
    case "mqhPastDone": // 過去の完了しなかったミッションリスト
      opt = { limit: 1, sort: { _id: -1 } };
      cond = params.pastId ? { _id: params.pastId } : {};
      coll = "mission_que_history";
      break;
    case "queuedMachines": // 今日の登録済みのマシン一覧
      let beforeNowDate = new Date();
      beforeNowDate.setMinutes(beforeNowDate.getMinutes() - 60);
      method = "distinct";
      cond = { key: "machine", filter: { mod_date: { $gte: beforeNowDate } } };
      coll = "mission_que";
      break;
    case "mqDone": // 今日の完了ミッションリスト
    case "mqNow": // 実行中ミッションリスト
      opt = { sort: { machine: -1, "valid_time.to": 1, "valid_time.from": 1 } };
      cond = { status: params.cond == "mqDone" ? "done" : "now" };
      coll = "mission_que";
      break;
    default:
      res.json({});
  }

  let recs = await db(coll, method, cond, opt);
  if (recs.length) {
    if (params.cond.indexOf("ps") === 0) {
      if (params.cond.indexOf("psTotal") === 0) {
        recs.forEach((rec) => {
          Object.values(D.CODE).forEach((val) => {
            rec[val] = rec[val] ? rec[val].p : 0;
          });
        });
      }
      if (params.cond.indexOf("psDiff") === 0) {
        recs.forEach((rec) => {
          Object.values(D.CODE).forEach((val) => {
            rec[val] = rec[val] ? rec[val].diff : 0;
          });
        });
      }
    } else if (params.cond.indexOf("mq") === 0) {
      let tmpRec = [];
      if (["mqNotDone", "mqPast", "mqDone", "mqNow"].indexOf(params.cond) > -1) {
        recs.forEach((rec) => {
          tmpRec.push({
            main: rec.main,
            sub: rec.sub,
            from: rec.valid_time ? (rec.valid_time.from ? rec.valid_time.from : null) : null,
            to: rec.valid_time ? (rec.valid_time.to ? rec.valid_time.to : null) : null,
            status: `${rec.status} [${rec.tryCnt ? rec.tryCnt : "0"}]`,
            site_code: rec.site_code,
            machine: rec.machine,
            mod_date: rec.mod_date,
            mission_date: rec.mission_date,
            exec_time: rec.exec_time,
            exec_time_start: rec.exec_time_start,
          });
        });
        recs = tmpRec;
      } else if (["mqhPast", "mqhPastDone"].indexOf(params.cond) > -1) {
        recs[0].details.forEach((rec) => {
          if (
            (params.cond == "mqhPast" && rec.status != "done") ||
            (params.cond == "mqhPastDone" && rec.status == "done")
          )
            tmpRec.push({
              main: rec.main,
              sub: rec.sub,
              from: rec.valid_time ? (rec.valid_time.from ? rec.valid_time.from : null) : null,
              to: rec.valid_time ? (rec.valid_time.to ? rec.valid_time.to : null) : null,
              status: `${rec.status} [${rec.tryCnt ? rec.tryCnt : "0"}]`,
              site_code: rec.site_code,
              machine: rec.machine,
              mod_date: rec.mod_date,
              mission_date: rec.mission_date,
              exec_time: rec.exec_time,
              exec_time_start: rec.exec_time_start,
            });
        });
        recs = tmpRec;
      }
    }
  }
  console.log("kita!");
  res.json(recs);
});

app.listen(port);
let db;
if (conf?.db?.nouse) {
  // mongodbを使わずにdefault.jsonに書いたデータを直接使って試す

db = async function(coll, method, cond = {}, opt = {}) {
  // 対象コレクションのデータを取得
  const data = conf.testdata[coll] ? JSON.parse(JSON.stringify(conf.testdata[coll])): [];
  if (coll === "mission_que") {
    data.forEach((r) => {
      r.valid_time = { from: r.from, to: r.to };
    });
  } else if (coll === "point_summary") {
    data.forEach((r) => {
      Object.values(D.CODE).forEach((val) => {
        r[val] = { diff: r[val], p: r[val] };
      });
    });
  }
  // 条件に合致するか判定するヘルパー関数
  const matchCondition = (item, cond) => {
    return Object.entries(cond).every(([key, val]) => {
      if (val && typeof val === "object") {
        // $ne 演算子対応
        if (val.$ne !== undefined) {
          return item[key] !== val.$ne;
        }
        // 他の演算子も同様に追加可能
        // 例: $eq, $gt, $lt, $in など
      }
      // 単純な等価比較
      return item[key] === val;
    });
  };
  switch (method) {
    case "find": {
      let res = data.filter(item => matchCondition(item, cond));

      // ソート処理（{ field: 1/-1 }）
      if (opt.sort) {
        const [[field, order]] = Object.entries(opt.sort);
        res.sort((a, b) => (a[field] > b[field] ? order : a[field] < b[field] ? -order : 0));
      }

      // リミット処理
      if (opt.limit) {
        res = res.slice(0, opt.limit);
      }

      return res;
    }
    case "findOne": {
      return data.find(item => matchCondition(item, cond)) || null;
    }
    case "distinct": {
      const key = cond.key;
      if (!key) return [];
      // const filterCond = cond.filter || {};
      const filterCond = {};
      const filtered = data.filter(item => matchCondition(item, filterCond));
      const distinctSet = new Set(filtered.map(item => item[key]));
      return Array.from(distinctSet);
    }
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
}
else if (conf?.db?.host) {
  const mdb = require("mongodb");
  db = async function(coll, method, cond = {}, opt) {
    const dbClient = mdb.MongoClient;
    try {
      let db = await dbClient.connect(`mongodb://${conf.db.host}/`);
      const dbName = db.db("sm");
      const collection = dbName.collection(coll);
      let res;
      switch (method) {
        case "find":
          res = await collection.find(cond);
          if (opt.sort) {
            res = await res.sort(opt.sort);
          }
          if (opt.limit) {
            res = await res.limit(opt.limit);
          }
          res = await res.toArray();
          break;
        case "findOne":
          res = await collection.findOne(cond);
          break;
        case "distinct":
          res = await collection.distinct(cond.key, cond.filter);
          break;
        default:
      }
      db.close();
      return res;
    } catch (e) {
      throw e;
    }
  }
}

