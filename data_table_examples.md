# 数据表示例文件

## 文件夹结构（简化版）
```
data_tables/
├── virtue_system.json          # 德行系统配置（JSON）
├── character_names.csv         # 角色姓名数据（CSV）
├── balance_config.json         # 游戏平衡参数（JSON）
├── skill_definitions.csv       # 技能定义（CSV）
├── location_configs.csv        # 地点配置（CSV）
└── event_templates.csv         # 事件模板（CSV）
```

## virtue_system.json
```json
{
  "virtueCategories": {
    "仁": {
      "name": "仁德",
      "description": "仁者爱人，关乎情感与人际",
      "color": "#FF6B6B",
      "importance": 9,
      "traits": [
        {
          "id": "compassion_tendency",
          "name": "相爱倾向",
          "negative": "不易坠入爱河",
          "positive": "容易产生爱意",
          "weight": 1.0,
          "stability": 0.6,
          "initialRange": [-20, 20]
        },
        {
          "id": "anti_hate_tendency",
          "name": "抑憎倾向",
          "negative": "易生仇恨",
          "positive": "不易憎恨",
          "weight": 1.2,
          "stability": 0.7,
          "initialRange": [-30, 30]
        }
      ]
    },
    "义": {
      "name": "义德",
      "description": "义者宜也，关乎道德与责任",
      "color": "#4ECDC4",
      "importance": 10,
      "traits": [
        {
          "id": "gratitude_tendency",
          "name": "感恩倾向",
          "negative": "不知感恩",
          "positive": "知恩图报",
          "weight": 1.1,
          "stability": 0.5,
          "initialRange": [-25, 25]
        }
      ]
    }
  },
  "behaviorEffects": {
    "帮助他人": {
      "仁": {
        "相爱倾向": 2,
        "抑憎倾向": 1
      },
      "义": {
        "感恩倾向": 3,
        "利他倾向": 2
      }
    },
    "读书学习": {
      "智": {
        "好奇倾向": 2,
        "专注倾向": 1
      }
    }
  }
}
```

## character_names.csv
```csv
period,social_class,surname_type,surname,gender,name_type,name,meaning,frequency
南北朝,门阀士族,五姓七望,李,男,文雅,明德,光明德行,high
南北朝,门阀士族,五姓七望,李,男,武勇,建功,建立功业,medium
南北朝,门阀士族,五姓七望,王,男,文雅,文华,文采华美,high
南北朝,门阀士族,五姓七望,王,女,美德,淑慧,淑女智慧,high
南北朝,胡族,复姓,慕容,男,尊贵,雄霸,雄才霸业,rare
南北朝,胡族,复姓,拓跋,男,武勇,威武,威风武勇,medium
南北朝,平民,单姓,张,男,朴实,忠厚,忠诚厚道,high
南北朝,平民,单姓,张,女,贤淑,柔顺,温柔顺从,high
南北朝,平民,单姓,刘,男,勤劳,勤业,勤奋事业,high
南北朝,平民,单姓,陈,女,美丽,兰草,如兰花香草,medium
```

## balance_config.json
```json
{
  "skillLearning": {
    "baseLearnRate": 1.0,
    "masteryThreshold": 80,
    "teachingEffectiveness": 0.8,
    "practiceBonus": 1.2,
    "ageDecayFactor": 0.05
  },
  "relationships": {
    "familiarityGainRate": 1.0,
    "compatibilityInfluence": 0.6,
    "conflictDecayRate": 0.1,
    "marriageThreshold": 70,
    "friendshipThreshold": 60
  },
  "production": {
    "baseEfficiency": 1.0,
    "skillBonus": 0.02,
    "weatherModifier": 0.3,
    "toolBonus": 0.2,
    "teamworkBonus": 0.1
  },
  "seasonalModifiers": {
    "spring": {
      "farmingBonus": 1.2,
      "constructionBonus": 1.1,
      "tradeBonus": 0.9
    },
    "summer": {
      "farmingBonus": 1.3,
      "constructionBonus": 1.0,
      "tradeBonus": 1.1
    },
    "autumn": {
      "farmingBonus": 1.1,
      "constructionBonus": 0.9,
      "tradeBonus": 1.2
    },
    "winter": {
      "farmingBonus": 0.3,
      "constructionBonus": 0.6,
      "tradeBonus": 0.8
    }
  }
}
```

## skill_definitions.csv
```csv
category,skill_id,skill_name,description,importance,base_efficiency,required_tools,danger_level,skill_points
农业技能,farming,垦荒耕种,开垦土地种植农作物,critical,1.0,true,0.1,0
农业技能,animal_husbandry,畜牧养殖,饲养牲畜获取肉食,high,0.9,false,0.05,0
手工技能,handicraft,手工雕琢,制作各种手工艺品,high,0.8,true,0.02,0
手工技能,metallurgy,熔炼铸锻,冶炼金属制作工具,high,0.7,true,0.3,0
建筑技能,construction,住宅修建,建造居住房屋,high,0.9,true,0.2,0
建筑技能,fortification,坞堡营造,建造防御工事,critical,0.8,true,0.15,0
采集技能,logging,拓地伐林,砍伐树木获取木材,medium,0.7,true,0.1,0
采集技能,hunting,野外狩猎,狩猎野生动物,medium,0.6,true,0.4,0
社交技能,trading,商业贸易,与他人进行商品交换,medium,0.6,false,0.05,0
文化技能,study,经义研读,学习经典文献,low,0.5,false,0,0
```

## location_configs.csv
```csv
location_id,name,type,capacity,description,danger_level,tools_required,seasonal_bonus,available_actions
residential,住宅区,residential,20,居民生活的住宅建筑群,0.0,false,1.0,休息睡觉;盥洗沐浴;照料子女
farmland,农田,production,25,耕作农业的田地,0.05,true,1.2,垦荒耕种;畜牧养殖;园艺栽培
workshop,工坊,production,15,手工作业的场所,0.1,true,1.0,手工雕琢;熔炼铸锻;纺织缝纫
forest,山林,resource,10,茂密的森林,0.2,true,0.8,拓地伐林;野外狩猎;采药
river,河边,resource,10,清澈的河流,0.05,false,1.0,水产捕捞;盥洗沐浴;汲水
market,市集,social,30,商贾云集之地,0.1,false,1.1,摆摊交易;商铺经营;觅求好友
temple,祠堂,cultural,25,祭祀祖先的神圣场所,0.0,false,1.0,祝祷祭祀;经义研读;婚丧嫁娶
plaza,广场,social,40,公共聚会场所,0.0,false,1.0,社集看戏;起舞弄乐;饮酒聚宴
```

## event_templates.csv
```csv
event_id,name,type,category,rarity,description,min_trigger_population,season_restriction,effects,choices
harvest_festival,丰收节,cultural,opportunity,common,庆祝农作物丰收的节日,5,autumn,happiness+10;social+5,参与庆祝;专心工作;组织活动
merchant_visit,商队到访,social,opportunity,uncommon,外地商人到访进行贸易,8,,trade_bonus+20,热情招待;谨慎交易;拒绝往来
bandit_attack,盗匪袭击,social,disaster,rare,盗匪团伙袭击坞堡,10,,safety-30;resources-20,组织抵抗;交出财物;求助官府
disease_outbreak,疾病爆发,natural,disaster,rare,传染性疾病在人群中蔓延,15,,health-40,隔离治疗;求神拜佛;草药医治
good_weather,风调雨顺,natural,opportunity,common,天气适宜农业生产,0,spring,farming_bonus+15,加紧耕作;储备粮食;感谢天恩
```

## 使用示例

### 在代码中加载数据表
```javascript
// 加载德行系统配置
const virtueConfig = await dataManager.dataTableManager.getVirtueSystemConfig();

// 加载角色姓名数据
const nameData = await dataManager.dataTableManager.getCharacterNamesConfig();

// 根据CSV数据生成随机姓名
function generateRandomName(gender, socialClass = '平民') {
  const candidates = nameData.filter(row => 
    row.gender === gender && 
    row.social_class === socialClass &&
    row.frequency === 'high'
  );
  
  if (candidates.length === 0) return '无名氏';
  
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected.surname + selected.name;
}

// 加载平衡配置
const balanceConfig = await dataManager.dataTableManager.getBalanceConfig();
const springBonus = balanceConfig.seasonalModifiers.spring.farmingBonus;
```