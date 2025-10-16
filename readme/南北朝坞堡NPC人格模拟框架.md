import random
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import json
from datetime import datetime, timedelta

# 枚举定义
class ActionCategory(Enum):
    PRODUCTION = "生产类"
    CONSTRUCTION = "建设类"
    COMMERCE = "商业类"
    RESEARCH = "研究学习类"
    BIOLOGICAL = "生理需求类"
    ENTERTAINMENT = "娱乐类"
    SOCIAL = "社交责任类"
    CEREMONY = "礼仪类"
    RELIGION = "宗教类"
    CRIME = "犯罪类"

class Virtue(Enum):
    REN = "仁"  # 相爱倾向、抑憎倾向、抑妒倾向、讨好倾向、痴情倾向
    YI = "义"   # 感恩倾向、利他倾向、勇敢倾向、担责倾向、泯仇倾向
    LI = "礼"   # 合群倾向、完美倾向、尊礼倾向、和谐倾向、规范倾向
    ZHI = "智"  # 主导倾向、隐私倾向、好奇倾向、空谈倾向、艺术倾向
    XIN = "信"  # 信任倾向、鼓舞倾向、专注倾向、固化倾向、坚持倾向
    WEN = "温"  # 抑怒倾向、抗郁倾向、抗虑倾向、温善倾向、稳重倾向
    LIANG = "良" # 寡欲倾向、自信倾向、幽默倾向、敏感倾向、乐观倾向
    GONG = "恭"  # 止暴倾向、兼听倾向、谦逊倾向、压力倾向、害羞倾向
    JIAN = "俭"  # 自律倾向、忙碌倾向、平和倾向、轻财倾向、节约倾向
    RANG = "让"  # 包容倾向、淡泊倾向、出世倾向、本真倾向

@dataclass
class PhysicalState:
    """生理状态 (0-100)"""
    hunger: int = 50        # 饱食
    thirst: int = 50        # 饮水
    cleanliness: int = 50   # 清洁
    sleep: int = 50         # 睡眠
    excretion: int = 50     # 排泄
    stamina: int = 50       # 体力
    temperature: int = 50   # 体温
    health: int = 80        # 健康

@dataclass
class EmotionalState:
    """情绪状态 (0-100)"""
    happiness: int = 50     # 快乐
    sadness: int = 20       # 悲伤
    anger: int = 20         # 愤怒
    fear: int = 20          # 恐惧
    anxiety: int = 30       # 焦虑
    shame: int = 20         # 羞耻
    boredom: int = 30       # 无聊
    loneliness: int = 30    # 孤独

@dataclass
class Attitude:
    """态度倾向 (-100 to 100)"""
    love: int = 0           # 喜爱
    hate: int = 0           # 憎恶
    jealousy: int = 0       # 嫉妒
    respect: int = 0        # 崇敬
    contempt: int = 0       # 轻蔑

@dataclass
class Appearance:
    """外观属性"""
    height: int = 170       # 身高(cm)
    weight: int = 60        # 体重(kg)
    beauty: int = 50        # 相貌 (0-100)

@dataclass
class Relationship:
    """人际关系 (0-100)"""
    compatibility: int = 50  # 契合度
    familiarity: int = 0     # 熟识度
    kinship: int = 0         # 亲情度
    romance: int = 0         # 爱恋度
    lust: int = 0           # 欲念度

@dataclass
class Ability:
    """能力属性 (0-100)"""
    # 膂力
    strength_burst: int = 50    # 爆发指数
    strength_endurance: int = 50 # 持久指数
    
    # 悟性
    creativity: int = 50        # 创造指数
    intuition: int = 50         # 直觉指数
    memory: int = 50           # 记忆指数
    
    # 根骨
    recovery: int = 50         # 恢复指数
    disease_resistance: int = 50 # 抗病指数
    
    # 身法
    spatial_awareness: int = 50  # 空间指数
    coordination: int = 50      # 协调指数
    
    # 灵性
    musical_sense: int = 50     # 乐感指数
    aesthetic_sense: int = 50   # 美感指数
    literary_talent: int = 50   # 文采指数
    
    # 定力
    focus: int = 50            # 专注指数
    willpower: int = 50        # 意志指数
    patience: int = 50         # 耐心指数

@dataclass
class VirtueTraits:
    """德行特质 (-100 to 100, 负值表示负面倾向，正值表示正面倾向)"""
    # 仁
    loving_tendency: int = 0        # 相爱倾向
    hate_suppression: int = 0       # 抑憎倾向
    jealousy_suppression: int = 0   # 抑妒倾向
    pleasing_tendency: int = 0      # 讨好倾向
    devotion_tendency: int = 0      # 痴情倾向
    
    # 义
    gratitude_tendency: int = 0     # 感恩倾向
    altruism_tendency: int = 0      # 利他倾向
    courage_tendency: int = 0       # 勇敢倾向
    responsibility_tendency: int = 0 # 担责倾向
    forgiveness_tendency: int = 0   # 泯仇倾向
    
    # 礼
    social_tendency: int = 0        # 合群倾向
    perfectionism: int = 0          # 完美倾向
    politeness_tendency: int = 0    # 尊礼倾向
    harmony_tendency: int = 0       # 和谐倾向
    orderliness: int = 0           # 规范倾向
    
    # 智
    dominance_tendency: int = 0     # 主导倾向
    privacy_tendency: int = 0       # 隐私倾向
    curiosity_tendency: int = 0     # 好奇倾向
    abstract_tendency: int = 0      # 空谈倾向
    artistic_tendency: int = 0      # 艺术倾向
    
    # 信
    trust_tendency: int = 0         # 信任倾向
    inspiring_tendency: int = 0     # 鼓舞倾向
    focus_tendency: int = 0         # 专注倾向
    stubbornness: int = 0          # 固化倾向
    persistence: int = 0           # 坚持倾向
    
    # 温
    anger_suppression: int = 0      # 抑怒倾向
    depression_resistance: int = 0  # 抗郁倾向
    anxiety_resistance: int = 0     # 抗虑倾向
    compassion_tendency: int = 0    # 温善倾向
    prudence: int = 0              # 稳重倾向
    
    # 良
    lust_suppression: int = 0       # 寡欲倾向
    confidence: int = 0            # 自信倾向
    humor_tendency: int = 0         # 幽默倾向
    sensitivity: int = 0           # 敏感倾向
    optimism: int = 0              # 乐观倾向
    
    # 恭
    violence_aversion: int = 0      # 止暴倾向
    advice_acceptance: int = 0      # 兼听倾向
    humility: int = 0              # 谦逊倾向
    stress_resistance: int = 0      # 压力倾向
    shyness: int = 0               # 害羞倾向
    
    # 俭
    self_discipline: int = 0        # 自律倾向
    busyness: int = 0              # 忙碌倾向
    peacefulness: int = 0          # 平和倾向
    material_detachment: int = 0    # 轻财倾向
    frugality: int = 0             # 节约倾向
    
    # 让
    tolerance: int = 0             # 包容倾向
    ambition_suppression: int = 0   # 淡泊倾向
    worldly_detachment: int = 0     # 出世倾向
    authenticity: int = 0          # 本真倾向

@dataclass
class ActionContext:
    """行为上下文"""
    location: str = ""              # 当前位置
    time_of_day: str = ""          # 时间段
    season: str = ""               # 季节
    weather: str = ""              # 天气
    available_actions: List[str] = field(default_factory=list)  # 可执行行为
    nearby_npcs: List[str] = field(default_factory=list)       # 附近的NPC
    current_activity: Optional[str] = None                     # 当前活动

@dataclass
class Memory:
    """记忆系统"""
    event: str                     # 事件描述
    participants: List[str]        # 参与者
    location: str                  # 发生地点
    timestamp: datetime           # 时间戳
    emotional_impact: int         # 情感影响 (-100 to 100)
    importance: int               # 重要性 (0-100)

class NPCPersonality:
    """NPC人格系统"""
    
    def __init__(self, name: str, age: int, gender: str):
        self.name = name
        self.age = age
        self.gender = gender
        
        # 核心属性
        self.physical_state = PhysicalState()
        self.emotional_state = EmotionalState()
        self.attitude = Attitude()
        self.appearance = Appearance()
        self.ability = Ability()
        self.virtue_traits = VirtueTraits()
        
        # 关系网络 (其他NPC名称 -> 关系对象)
        self.relationships: Dict[str, Relationship] = {}
        
        # 记忆系统
        self.memories: List[Memory] = []
        
        # 行为上下文
        self.context = ActionContext()
        
        # 当前目标和计划
        self.current_goals: List[str] = []
        self.action_queue: List[str] = []
        
        # 技能和经验
        self.skills: Dict[str, int] = {}  # 技能名称 -> 熟练度(0-100)
        
        # 个人偏好
        self.preferences: Dict[str, int] = {}  # 偏好类型 -> 强度(-100 to 100)
        
    def update_context(self, location: str, time_of_day: str, season: str, weather: str, nearby_npcs: List[str]):
        """更新环境上下文"""
        self.context.location = location
        self.context.time_of_day = time_of_day
        self.context.season = season
        self.context.weather = weather
        self.context.nearby_npcs = nearby_npcs
        
    def add_memory(self, event: str, participants: List[str], location: str, emotional_impact: int, importance: int):
        """添加记忆"""
        memory = Memory(
            event=event,
            participants=participants,
            location=location,
            timestamp=datetime.now(),
            emotional_impact=emotional_impact,
            importance=importance
        )
        self.memories.append(memory)
        
        # 限制记忆数量，移除不重要的旧记忆
        if len(self.memories) > 100:
            self.memories.sort(key=lambda m: m.importance, reverse=True)
            self.memories = self.memories[:80]
    
    def calculate_action_preference(self, action_type: str) -> float:
        """计算对特定行为的偏好度"""
        preference_score = 0.0
        
        # 基于生理需求的计算
        if action_type in ["进食饮水", "休息睡眠", "盥洗沐浴", "更衣小解"]:
            if action_type == "进食饮水":
                preference_score += (100 - self.physical_state.hunger) * 0.01
                preference_score += (100 - self.physical_state.thirst) * 0.01
            elif action_type == "休息睡眠":
                preference_score += (100 - self.physical_state.sleep) * 0.01
            elif action_type == "盥洗沐浴":
                preference_score += (100 - self.physical_state.cleanliness) * 0.01
        
        # 基于情绪状态的计算
        if action_type in ["踏青出游", "饮酒聚宴", "赌博对弈", "起舞弄乐"]:
            preference_score += self.emotional_state.boredom * 0.005
            preference_score += self.emotional_state.loneliness * 0.005
            preference_score -= self.emotional_state.sadness * 0.003
        
        # 基于德行特质的计算
        if action_type in ["拓地伐林", "垦荒耕钟", "手工雕琢"]:
            preference_score += self.virtue_traits.busyness * 0.005
            preference_score += self.virtue_traits.self_discipline * 0.003
            preference_score -= self.virtue_traits.peacefulness * 0.002
        
        if action_type in ["赡养老人", "照顾婴孺"]:
            preference_score += self.virtue_traits.altruism_tendency * 0.008
            preference_score += self.virtue_traits.compassion_tendency * 0.006
        
        if action_type in ["摆摊交易", "商铺经营"]:
            preference_score -= self.virtue_traits.material_detachment * 0.005
            preference_score += self.virtue_traits.dominance_tendency * 0.003
        
        # 基于能力的计算
        if action_type in ["拓地伐林", "采石挖矿"]:
            preference_score += (self.ability.strength_burst + self.ability.strength_endurance) * 0.002
        
        if action_type in ["经义研读", "工艺革新"]:
            preference_score += (self.ability.creativity + self.ability.memory + self.ability.focus) * 0.002
        
        if action_type in ["艺术创作", "起舞弄乐"]:
            preference_score += (self.ability.aesthetic_sense + self.ability.literary_talent + self.ability.musical_sense) * 0.002
        
        # 基于社交需求
        if action_type in ["追求伴侣", "觅求好友"]:
            preference_score += self.emotional_state.loneliness * 0.008
            preference_score += self.virtue_traits.social_tendency * 0.005
            preference_score -= self.virtue_traits.shyness * 0.003
        
        return max(0.0, min(1.0, preference_score))
    
    def decide_next_action(self, available_actions: List[str]) -> Optional[str]:
        """决策下一个行为"""
        if not available_actions:
            return None
        
        # 计算每个行为的权重
        action_weights = {}
        for action in available_actions:
            base_preference = self.calculate_action_preference(action)
            
            # 加入随机因素
            randomness = random.uniform(0.8, 1.2)
            
            # 考虑记忆中的经验
            memory_modifier = self._get_memory_modifier_for_action(action)
            
            # 考虑当前状态的紧急性
            urgency_modifier = self._get_urgency_modifier_for_action(action)
            
            final_weight = base_preference * randomness * memory_modifier * urgency_modifier
            action_weights[action] = final_weight
        
        # 选择权重最高的行为
        if action_weights:
            return max(action_weights, key=action_weights.get)
        
        return None
    
    def _get_memory_modifier_for_action(self, action: str) -> float:
        """基于记忆获取行为修正因子"""
        relevant_memories = [m for m in self.memories if action in m.event]
        if not relevant_memories:
            return 1.0
        
        # 计算相关记忆的平均情感影响
        avg_emotional_impact = sum(m.emotional_impact for m in relevant_memories) / len(relevant_memories)
        
        # 转换为修正因子 (0.5 to 1.5)
        return 1.0 + (avg_emotional_impact / 200.0)
    
    def _get_urgency_modifier_for_action(self, action: str) -> float:
        """获取基于当前状态的紧急性修正因子"""
        if action == "进食饮水":
            if self.physical_state.hunger < 20 or self.physical_state.thirst < 20:
                return 3.0
            elif self.physical_state.hunger < 40 or self.physical_state.thirst < 40:
                return 1.5
        
        if action == "休息睡眠":
            if self.physical_state.sleep < 15:
                return 2.5
            elif self.physical_state.sleep < 30:
                return 1.3
        
        if action == "求医用药":
            if self.physical_state.health < 30:
                return 4.0
            elif self.physical_state.health < 60:
                return 1.8
        
        return 1.0
    
    def update_relationship(self, other_npc: str, interaction_type: str, success: bool):
        """更新与其他NPC的关系"""
        if other_npc not in self.relationships:
            self.relationships[other_npc] = Relationship()
        
        rel = self.relationships[other_npc]
        
        # 增加熟识度
        rel.familiarity = min(100, rel.familiarity + 1)
        
        # 根据交互类型和结果更新关系
        if interaction_type in ["协作工作", "互助帮忙"] and success:
            rel.compatibility = min(100, rel.compatibility + 2)
            if self.virtue_traits.gratitude_tendency > 0:
                rel.compatibility += 1
        
        elif interaction_type in ["争吵", "冲突"] and not success:
            rel.compatibility = max(0, rel.compatibility - 5)
            if self.virtue_traits.forgiveness_tendency < 0:
                rel.compatibility -= 2
        
        elif interaction_type in ["浪漫接触", "求偶"] and success:
            rel.romance = min(100, rel.romance + 3)
            rel.lust = min(100, rel.lust + random.randint(1, 3))
    
    def get_personality_summary(self) -> Dict:
        """获取人格特征摘要"""
        return {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "dominant_virtues": self._get_dominant_virtues(),
            "main_skills": self._get_top_skills(),
            "current_mood": self._get_current_mood(),
            "relationships_count": len(self.relationships),
            "memories_count": len(self.memories)
        }
    
    def _get_dominant_virtues(self) -> List[str]:
        """获取主导德行"""
        virtue_scores = {}
        traits = self.virtue_traits.__dict__
        
        # 将各个特质归类到对应德行
        virtue_mapping = {
            "仁": ["loving_tendency", "hate_suppression", "jealousy_suppression", "pleasing_tendency", "devotion_tendency"],
            "义": ["gratitude_tendency", "altruism_tendency", "courage_tendency", "responsibility_tendency", "forgiveness_tendency"],
            "礼": ["social_tendency", "perfectionism", "politeness_tendency", "harmony_tendency", "orderliness"],
            "智": ["dominance_tendency", "privacy_tendency", "curiosity_tendency", "abstract_tendency", "artistic_tendency"],
            "信": ["trust_tendency", "inspiring_tendency", "focus_tendency", "stubbornness", "persistence"],
            "温": ["anger_suppression", "depression_resistance", "anxiety_resistance", "compassion_tendency", "prudence"],
            "良": ["lust_suppression", "confidence", "humor_tendency", "sensitivity", "optimism"],
            "恭": ["violence_aversion", "advice_acceptance", "humility", "stress_resistance", "shyness"],
            "俭": ["self_discipline", "busyness", "peacefulness", "material_detachment", "frugality"],
            "让": ["tolerance", "ambition_suppression", "worldly_detachment", "authenticity"]
        }
        
        for virtue, trait_names in virtue_mapping.items():
            total_score = sum(traits.get(trait, 0) for trait in trait_names)
            virtue_scores[virtue] = total_score / len(trait_names)
        
        # 返回得分最高的3个德行
        sorted_virtues = sorted(virtue_scores.items(), key=lambda x: abs(x[1]), reverse=True)
        return [virtue for virtue, score in sorted_virtues[:3]]
    
    def _get_top_skills(self) -> List[str]:
        """获取最高技能"""
        if not self.skills:
            return []
        sorted_skills = sorted(self.skills.items(), key=lambda x: x[1], reverse=True)
        return [skill for skill, level in sorted_skills[:3]]
    
    def _get_current_mood(self) -> str:
        """获取当前情绪状态"""
        emotions = {
            "快乐": self.emotional_state.happiness,
            "悲伤": self.emotional_state.sadness,
            "愤怒": self.emotional_state.anger,
            "恐惧": self.emotional_state.fear,
            "焦虑": self.emotional_state.anxiety,
            "孤独": self.emotional_state.loneliness
        }
        return max(emotions, key=emotions.get)

# 使用示例
def create_sample_npc():
    """创建示例NPC"""
    npc = NPCPersonality("李明", 25, "男")
    
    # 设置一些特征
    npc.virtue_traits.altruism_tendency = 60
    npc.virtue_traits.social_tendency = 40
    npc.virtue_traits.busyness = 70
    
    npc.ability.strength_burst = 75
    npc.ability.creativity = 60
    npc.ability.focus = 80
    
    npc.skills = {"农耕": 65, "木工": 45, "交际": 55}
    
    return npc

# 测试系统
if __name__ == "__main__":
    # 创建测试NPC
    npc = create_sample_npc()
    
    # 更新环境
    npc.update_context("农田", "上午", "春季", "晴朗", ["张三", "李四"])
    
    # 测试行为决策
    available_actions = ["垦荒耕钟", "拓地伐林", "休息睡眠", "追求伴侣", "饮酒聚宴"]
    chosen_action = npc.decide_next_action(available_actions)
    
    print(f"NPC {npc.name} 选择的行为: {chosen_action}")
    print(f"人格摘要: {json.dumps(npc.get_personality_summary(), ensure_ascii=False, indent=2)}")