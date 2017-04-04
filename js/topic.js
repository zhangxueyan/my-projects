'use strict';

const TopicSerializer = require('../../../serializers/topic'),
  RelationSerializer = require('../../../serializers/relation'),
  {parseRelation, saveRelation, deleteRelation} = require('ainterest_core/models/relation'),
  MediumSerializer = require('../../../serializers/medium'),
  UserSerializer = require('../../../serializers/user'),
  BadRequestError = require('ainterest_core/errors/BadRequestError'),
  NotFoundError = require('ainterest_core/errors/NotFoundError'),
  Models = require('ainterest_core').models,
  {driver} = require('ainterest_core').neo4j,
  _ = require('underscore'),
  moment = require('moment'),
  sequelize = Models.sequelize,
  Topic = Models.Topic,
  User = Models.User,
  Medium = Models.Medium,
  UserTopic = Models.UserTopic,
  TopicMedium = Models.TopicMedium,
  deepExtend = require('deep-extend'),
  entities = require('entities'),
  JSONAPIDeserializer = require('jsonapi-serializer').Deserializer,
  deserializer = new JSONAPIDeserializer({
    keyForAttribute: 'camelCase'
  }),
  leanCloud = require('ainterest_core/leanCloud/leanCloud');

module.exports = router => {
  /*
    @api {get} /topics?root=xx&maxDepth=3
    @apiName Get topics
    @apiDescription Get topics under a root. If query.root is not specified, '「根话题」' will be returned. query.maxDepth is optional (default is 3).
    @apiSuccessExample success response example:
    {
      "data": [
        {
          "type": "topics",
          "id": "15fc7400-50c0-4623-a6e2-6b4a9c22238d",
          "attributes": {
            "name": "留学",
            "description": "出国留学",
            "classes": [
              "Topic"
            ]
          },
          "relationships": {
            "relations": {
              "data": [
                {
                  "type": "relations",
                  "id": "eeb7b322-42af-4d34-98e2-95019ca8bdb0"
                },
                {
                  "type": "relations",
                  "id": "d8a3fbba-a346-4a67-8f5f-17308a0109e0"
                },
                {
                  "type": "relations",
                  "id": "61f8cae7-eb9a-43b6-ae3c-f1b860f9f9f1"
                }
              ]
            }
          }
        },
        {
          "type": "topics",
          "id": "0c019584-08d4-4876-96ca-f1f6d78fdbfa",
          "attributes": {
            "name": "背景提升期",
            "description": "",
            "classes": [
              "Topic"
            ]
          }
        },
        {
          "type": "topics",
          "id": "0a211883-606a-4d68-8223-db8fac33b31d",
          "attributes": {
            "name": "个人选择期",
            "description": "",
            "classes": [
              "Topic"
            ]
          }
        },
        {
          "type": "topics",
          "id": "2dd95172-0634-4a43-ab10-870904c294bb",
          "attributes": {
            "name": "申请季",
            "description": "",
            "classes": [
              "Topic"
            ]
          }
        }
      ],
      "included": [
        {
          "type": "relations",
          "id": "eeb7b322-42af-4d34-98e2-95019ca8bdb0",
          "attributes": {
            "from": "15fc7400-50c0-4623-a6e2-6b4a9c22238d",
            "to": "0c019584-08d4-4876-96ca-f1f6d78fdbfa",
            "type": "Stage_in_time",
            "order": 1
          }
        },
        {
          "type": "relations",
          "id": "d8a3fbba-a346-4a67-8f5f-17308a0109e0",
          "attributes": {
            "from": "15fc7400-50c0-4623-a6e2-6b4a9c22238d",
            "to": "0a211883-606a-4d68-8223-db8fac33b31d",
            "type": "Stage_in_time",
            "order": 2
          }
        },
        {
          "type": "relations",
          "id": "61f8cae7-eb9a-43b6-ae3c-f1b860f9f9f1",
          "attributes": {
            "from": "15fc7400-50c0-4623-a6e2-6b4a9c22238d",
            "to": "2dd95172-0634-4a43-ab10-870904c294bb",
            "type": "Stage_in_time",
            "order": 3
          }
        }
      ]
    }
  */
  router.get('/topics', (req, res, next) => {
    const params = {
            where: {name: req.query.root},
            maxDepth: 3
          };

    if (!req.query.root || req.query.root === Topic.rootName()) {
      params.where = {id: Topic.rootId()};
    }

    if (req.query.maxDepth) {
      params.maxDepth = +req.query.maxDepth;
    }

    Topic.findGraph(params)
      .then((results) => {
        res.send(TopicSerializer.serialize(results));
      })
      .catch(error => {
        console.log(error);
        next(new BadRequestError('400', error));
      });
  });

  /*
    @api {get} /topics/query?query=xxx
    @apiName Search topics
    @apiDescription Search for topics by name
    @apiSuccessExample success response example:
    {
      "data": [
        {
          "type": "topics",
          "id": "15fc7400-50c0-4623-a6e2-6b4a9c22238d",
          "attributes": {
            "name": "留学",
            "description": "出国留学",
            "classes": [
              "Topic"
            ]
          }
        },
        {
          "type": "topics",
          "id": "0c019584-08d4-4876-96ca-f1f6d78fdbfa",
          "attributes": {
            "name": "背景提升期",
            "description": "",
            "classes": [
              "Topic"
            ]
          }
        }
      ]
    }
  */
  router.get('/topics/query', (req, res, next) => {
    const key = req.query.query;

    Topic.findAll({
      where : {
        name : {
          '$like' : `.*${key}.*`
        }
      },
      limit : 15
    })
      .then(function (topics) {
        res.send(TopicSerializer.serialize(topics));
      })
      .catch(error => {
        console.log(error);
        next(new BadRequestError('400', error));
      });
  });

  /*
    @api {patch} /topics
    @apiName Update topics
    @apiDescription Update topics and relations
    @apiParamExample {json} request example:
    {
      "data": [
        {
          "type": "topics",
          "action": "save",
          "id": "15fchdne-50c0-4623-a6e2-6b4a9c22238d",
          "attributes": {
            "name": "GMAT单词",
            "description": "bla"
          }
        },
        {
          "type": "relations",
          "action": "save",
          "id": "15fchdne-50c0-4623-a6e2-6b4a9c63788d",
          "attributes": {
            "from": "0c0061be-866f-447b-a521-b1308dfc4768",
            "to": "15fchdne-50c0-4623-a6e2-6b4a9c22238d",
            "type": "Include",
            "order": 5
          }
        },
        {
          "type": "topics",
          "action": "delete",
          "id": "15fchdne-50c0-4623-a6e2-6b4a9c22238d"
        },
        {
          "type": "relations",
          "action": "delete",
          "id": "15fchdne-50c0-4623-a6e2-6b4a9c63788d"
        }
      ]
    }
    @apiSuccessExample success response example:
    {
      "result": [
        {
          "data": {
            "id": "89ee86e3-bdcc-4626-a9d7-91c0263fe049",
            "type": "relations",
            "attributes": {
              "from": "b0edafed-6b5b-48fd-8e1f-57f602427d35",
              "to": "969da98e-a956-43b5-8ce7-8de296ea641b",
              "order": "2",
              "type": "Include"
            }
          }
        }
      ]
    }
  */
  router.patch('/topics', (req, res, next) => {
    const session = driver.session();
    const tx = session.beginTransaction();

    const results = [];
    req.body.data.forEach(op => {
      if (op.type === 'topics') {
        switch (op.action) {
          case 'save':
            Topic.save(tx, Object.assign({id: op.id}, op.attributes)).then(result => {
              results.push(TopicSerializer.serialize(result));
            });
            break;
          case 'delete':
            Topic.deleteTopic(tx, op);
            break;
        }
      } else if (op.type === 'relations') {
        switch (op.action) {
          case 'save':
            saveRelation(tx, op).then(result => {
              results.push(RelationSerializer.serialize(result));
            }).catch( error => console.log(error));
            break;
          case 'delete':
            deleteRelation(tx, op);
            break;
        }
      }
    });

    tx.commit()
      .then(result => {
        session.close();
        res.send({result: results});
      })
      .catch(error => {
        session.close();
        next(new BadRequestError('400', error));
      });
  });

  /*
    @api {get} /topics/:topicId/media?page[number]=1&page[size]=100
    @apiName Get media under topic
    @apiDescription Get media associated with a topic
    @apiSuccessExample success response example:
    {
      "data":[
        {
          "type": "media",
          "id": "df5f2700-ec51-11e6-987f-d16075294c60",
          "attributes": {
            "confirmed": false,
            "content": "…",
            "title": "...",
            "link": "https://moment.douban.com/post/161382/?douban_rec=1",
            "meta-data": {
                "votes": 3
            },
            "author": "XX",
            "keywords": [
                "xx",
                "xxx"
            ],
            "labels": [],
            "source": "Flipboard"
          }
        }
      ]
    }
  */
  router.get('/topics/:topicId/media', (req, res) => {
    const topicId = req.params.topicId,
          queryDefault = {
            page: {number: 1, size: 1000},
            fields: {users: ''}
          },
          query = deepExtend(queryDefault, req.query);

    TopicMedium.findAll({
      attributes: ['mediumId', 'confirmed'],
      where: {
        'topicId': topicId
      },
      offset: (query.page.number - 1) * (+query.page.size),
      limit: +query.page.size
    }).then(dbRes => {
      console.log('dblog:query media of topic , db result:' + dbRes);

      const confirmHash = dbRes.reduce((acc, row) => {
        acc[row.mediumId] = row.confirmed;
        return acc;
      }, {});

      Medium.findAll({
        where: {
          id: {
            $in: dbRes.map(ins => {
              return ins.mediumId;
            })
          }
        }
      }).then(dbRes => {
        // Add 'confirmed' from TopicMedium as an attribute of medium
        const data = MediumSerializer.serialize(dbRes);
        data.data.forEach(medium => {
          medium.attributes.confirmed = confirmHash[medium.id];
        });

        // Sort media: unconfirmed in front of confirmed
        const compareFunction = (a, b) => {
          const aConfirmed = a.attributes.confirmed,
                bConfirmed = b.attributes.confirmed;
          if (aConfirmed === bConfirmed) {
            return 0;
          }
          if (aConfirmed && !bConfirmed) {
            return 1;
          }
          return -1;
        };
        data.data.sort(compareFunction);

        res.send(data);
      });
    });
  });

  /*
    @api {post} /topics/:topicId/media
    @apiName Add media to topic
    @apiDescription Add media to a specific topic
    @apiParamExample {json} request example:
    {
      "mediumIdList": "df5f2700-ec51-11e6-987f-d16075294c60,df5f2701-ec51-11e6-987f-d16075294c60"
    }
    @apiSuccessExample success response example:
    {}
  */
  router.post('/topics/:topicId/media', (req, res) => {
    const mediumIdList = req.body.mediumIdList.split(',');
    let instanceList = [];
    for (let mediaId of mediumIdList) {
      instanceList.push({
        mediumId: mediaId,
        topicId: req.params.topicId,
        confirmed: true
      });
    }

    TopicMedium.bulkCreate(instanceList).then(() => {
      console.log('created :topic_rel_media' + req.params.topicId + '<--->' + mediumIdList);
      res.send({});
    });
  });

  /*
    @api {delete} /topics/:topicId/media/:mediumId
    @apiName Delete media from topic
    @apiDescription Delete media from a specific topic
    @apiSuccessExample success response example:
    {}
  */
  router.delete('/topics/:topicId/media/:mediumId', (req, res) => {
    const topicId = req.params.topicId,
      mediumId = req.params.mediumId;

    TopicMedium.destroy({
      where: {
        topicId: topicId,
        mediumId: mediumId
      }
    }).then(() => {
      res.send({});
    });
  });

  /**
   * @api {get} /topics/feeds?more=true&page[size]=1&page[number]=xxx&type=[recommend,hottest,newest]&lastUpdatedAt[recommendTopics]=xxxx&lastUpdatedAt[hottestTopics]=xxxx&lastUpdatedAt[newestTopics]=xxxx&userId=xxx
   * @apiName  GetHotTopics
   *
   * response example：
   {
     "data": [
       {
         "type": "recommendTopics",
         "id": "7f845800-fd8b-11e6-84ef-85bc1062ca67",
         "attributes": {
           "topicId": "7f845800-fd8b-11e6-84ef-85bc1062ca67",
           "name": "互金产品经理的业务逻辑",
           "imgUrl": "http://img02.tooopen.com/images/20141229/sl_107003776898.jpg",
           "description": "test descriptiontest descriptiontest descriptiontest description",
           "subscriptionsCount": 0,
           "updateAt": "2017-03-01 08:01:50",
           "updatesCount": 5,
           "isNew": true
         }
       },
       ...
     ],
     "meta": {
       "recommendTopicUpdatesCount": 40
     }
   }
   */

  router.get('/topics/feeds', (req, res, next) => {
    const queryDefault = {
      page: {number: 1, size: 10},
      fields: {topics: ''},
      lastUpdatedAt: {
        recommendTopics: null,
        hottestTopics: null,
        newestTopics: null
      },
      type: '',
      more: false,
      userId: ''
    },
      query = deepExtend(queryDefault, req.query);

    const userId = query.userId,
      getMore = query.more,
      feedsType = query.type,
      pageNumber = +query.page.number,
      pageSize = +query.page.size,
      lastUpdatedRecommendTime = +query.lastUpdatedAt.recommendTopics || null,
      lastUpdatedHottestTime = +query.lastUpdatedAt.hottestTopics || null,
      lastUpdatedNewestTime = +query.lastUpdatedAt.newestTopics || null;

    let user;

    const returnFeedsMore = userTopics => {
      const topicIdArray = _.map(userTopics, d => d.topicId),
            session = driver.session();
      let promise, resultData;

      switch (feedsType) {
        case 'recommend':
          promise = Topic.queryChildrenTopic(session, user.preferences.topics, topicIdArray, lastUpdatedRecommendTime, (pageNumber - 1) * pageSize, pageSize);
          break
        case 'hottest':
          promise = Topic.queryHottestTopic(session, topicIdArray, lastUpdatedHottestTime, (pageNumber - 1) * pageSize, pageSize);
          break
        case 'newest':
          promise = Topic.queryNewestTopic(session, topicIdArray, lastUpdatedNewestTime, (pageNumber - 1) * pageSize, pageSize);
          break
        default:
          return next(new BadRequestError('400', {message: 'feedsType error'}));
      }

      return promise
      .then(result => {
        if (result.length) {
          resultData = TopicSerializer.serialize(result).data.map(d => {
            d.type = `${feedsType}Topics`;
            return d;
          });

          return Promise.all(_.map(resultData, d => sequelize.query(`SELECT count(m.id) as count FROM TopicMedium as t left join Medium as m on t.mediumId = m.id  WHERE DATE(m.updatedAt) = CURDATE() and topicId = '${d.id}'`)))
            .then(countArray => {
              countArray.map((d, index) => {
                const attrs = resultData[index].attributes;
                attrs.updatesCount = d[0][0].count;

                console.log('publishedAt:', moment(attrs.publishedAt).format('YYYYMMDD'));
                console.log('today:',moment(new Date()).format('YYYYMMDD'));

                attrs.isNew = moment(new Date()).format('YYYYMMDD') === moment(attrs.publishedAt).format('YYYYMMDD');
              });
              res.send({data: resultData});
            });
        } else {
          res.send({data: []});
        }
      })
      .catch(err => {
        console.log('err:', err.stack || err);
        next(new BadRequestError('400', err));
      });
    };

    const returnFeedsSummary = userTopics => {
      const topicIdArray = _.map(userTopics, d => d.topicId),
            session = driver.session(),
            preferences = user.preferences;

      let resultData;
      return Promise.all([
        Topic.queryHottestTopic(session, topicIdArray, lastUpdatedHottestTime, 0, 4),
        Topic.queryNewestTopic(session, topicIdArray, lastUpdatedNewestTime, 0, 4),
        Topic.queryChildrenTopic(session, preferences.topics, topicIdArray, lastUpdatedRecommendTime, 0, 4)
      ])
      .then(results => {

        // @todo: split more evenly between the parent topic
        const types = ['newestTopics',  'hottestTopics', 'recommendTopics'];
        resultData = _.flatten(results.map((result, index) => {
          const arr = index === 2 ? result.splice(0, 4) : result;
          const data = TopicSerializer.serialize(arr);
          data.data.forEach(d => {
            d.type = types[index];
          });
          return data.data;
        }));

        return Promise.all(resultData.map(d => {
          return sequelize.query(`SELECT count(m.id) as count FROM TopicMedium as t left join Medium as m on t.mediumId = m.id  WHERE DATE(m.publishedAt) = CURDATE() and topicId = '${d.id}'`);
        }));
      }).then(countArray => {
        return countArray.map((d, index) => {
          const attrs = resultData[index].attributes;
          attrs.updatesCount = d[0][0].count;
          attrs.isNew = moment(new Date())
            .format('YYYYMMDD') === moment(attrs.publishedAt).format('YYYYMMDD');
        })
      }).then(() => {
        const session = driver.session();
        return Topic.queryChildrenTopicCount(session, user.preferences.topics, topicIdArray);
      }).then(totalRecommendCount => {
        res.send({data: resultData, meta: {recommendTopicUpdatesCount: totalRecommendCount}});
      }).catch(err => {
        console.log('err:', err.stack || err);
        next(new BadRequestError('400', err));
      });
    }

    Models.User.findOne({
      where: {
        id: userId
      }
    }).then(record => {
      user = record;
      return UserTopic.findAll({where: {userId}});
    }).then(userTopics => {
      if (getMore) {
        returnFeedsMore(userTopics);
      } else {
        returnFeedsSummary(userTopics);
      }
    });
  });

  /**
   * @api {post} /topics/:topicId/subscribe
   * @apiName  subscribe Topic
   *
   * @apiParamExample {json} payload example:
   *                         {
   *                           data: {
   *                             attributes: {
   *                               userId: 'xxx',
   *                             }
   *                           },
   *                           meta: {
   *                             action: 'unsubscribeTopic'
   *                           }
   *                         }
   */
  router.post('/topics/:topicId/subscribe', (req, res, next) => {
    deserializer.deserialize(req.body, (err, data) => {

      UserTopic.findOrCreate({where : {userId : data.userId, topicId : req.params.topicId}})
        .spread((obj, created) => {
          res.send(TopicSerializer.serialize(obj));
        })
        .catch(err => next(new BadRequestError('400', err)));
    })
  })

  /**
   * @api {post} /topics/:topicId/unsubscribe
   * @apiName  unsubscribe Topic
   *
   * @apiParamExample {json} payload example:
   *                         {
   *                           data: {
   *                             attributes: {
   *                               userId: 'xxx',
   *                             }
   *                           },
   *                           meta: {
   *                             action: 'unsubscribeTopic'
   *                           }
   *                         }
   */
  router.post('/topics/:topicId/unsubscribe', (req, res, next) => {
    deserializer.deserialize(req.body, (err, data) => {
      if (err) {
        next(new BadRequestError('400', err));
        return
      }

      UserTopic.findOne({where: {userId: data.userId, topicId: req.params.topicId}})
        .then((obj, created) => {
          obj.destroy();
          res.send({"data": "success"});
        })
        .catch(err => next(new BadRequestError('400', err)));
    });

  });

  /*
    @api {get} /topics/:id/relationships/users?page[number]=1&page[size]=100
    @apiName Get users under topic
    @apiDescription Get all users who subscribed a specific topic
    @apiSuccessExample success response example:
    {
      "data":[
        {
          "type": "users",
          "id": "df5f2700-ec51-11e6-987f-d16075294c60",
          "attributes": {
            "username": "abc",
            "phone": "1234567890",
            "email": "abc@abc.com",
            "weChatId": "wechat",
            "invitationCode": "XX",
            "role": ""
          }
        },
        {
          "type": "users",
          "id": "df5f2700-ec51-11e6-987f-d16075294c61",
          "attributes": {
            "username": "def",
            "phone": "9876543210",
            "email": "def@abc.com",
            "weChatId": "wechat_id",
            "invitationCode": "yy",
            "role": ""
          }
        }
      ]
    }
  */
  router.get('/topics/:id/relationships/users', (req, res, next) => {
    const queryDefault = {
            page: {number: 1, size: 1000},
            fields: {users: ''}
          },
          query = deepExtend(queryDefault, req.query),
          topicId = req.params.id,
          params = {
            offset: (query.page.number - 1) * (+query.page.size),
            limit: +query.page.size
          };

    Topic.getUsersByTopicIds([topicId], params).then(result => {
      res.send(UserSerializer.serialize(result));
    });
  });

  /*
    @api {post} /topics/:topicId/media/:mediumId/confirm
    @apiName Confirm medium to topic
    @apiDescription Confirm the relation between a medium and a topic
    @apiParamExample {json} request example:
    {}
    @apiSuccessExample success response example:
    {}
  */
  router.post('/topics/:topicId/media/:mediumId/confirm', (req, res) => {
    const topicId = req.params.topicId,
          mediumId = req.params.mediumId;

    TopicMedium.findAll({
      attributes: ['confirmed'],
      where: {
        topicId,
        mediumId
      }
    }).then(results => {
      if (results.length === 0) {
        throw new NotFoundError('404', {message: 'Relation between the medium and the topic is not found.'});
      }
      const topicMedium = results[0];
      return topicMedium.update({confirmed: true});
    }).then(topicMedium => {
      res.send({});
    });
  });

  /*
    @api {post} /topics/:topicId/media/:mediumId/unconfirm
    @apiName Unconfirm medium to topic
    @apiDescription Unconfirm the relation between a medium and a topic
    @apiParamExample {json} request example:
    {}
    @apiSuccessExample success response example:
    {}
  */
  router.post('/topics/:topicId/media/:mediumId/unconfirm', (req, res) => {
    const topicId = req.params.topicId,
          mediumId = req.params.mediumId;

    TopicMedium.findAll({
      attributes: ['confirmed'],
      where: {
        topicId,
        mediumId
      }
    }).then(results => {
      if (results.length === 0) {
        throw new NotFoundError('404', {message: 'Relation between the medium and the topic is not found.'});
      }
      const topicMedium = results[0];
      return topicMedium.update({confirmed: false});
    }).then(topicMedium => {
      res.send({});
    });
  });
};
