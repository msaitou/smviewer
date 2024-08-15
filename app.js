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
    GEN: "gen",
    SUG: "sug",
    LFM: "lfm",
    PST: "pst",
    PIL: "pil",
    AME: "ame",
    RAKU: "raku",
    DMY: "dmy",
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
const mdb = require("mongodb");
async function db(coll, method, cond = {}, opt) {
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
      // case "update":
      //   let cnt = 0;
      //   if (cond) {
      //     cnt = await collection.countDocuments(cond);
      //   }
      //   if (cnt) {
      //     res = await collection.updateOne(cond, { $set: doc });
      //   } else {
      //     // insert
      //     res = await collection.insertOne(doc);
      //   }
      //   break;
      // case "insertMany":
      //   res = await collection.insertMany(doc);
      //   break;
      // case "delete":
      //   res = await collection.deleteMany(doc);
      default:
    }
    db.close();
    return res;
  } catch (e) {
    throw e;
  }
}
