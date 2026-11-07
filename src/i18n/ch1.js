import { i18n } from '../i18n.js';

export const CH1_I18N = {
  zh: {
    // Map & Pure Vision Intro Card
    'map.pharping': '帕平・揚列雪',
    'toast.enterPharping': '踏入尼泊爾帕平谷地 —— 三年大旱，赤地千里',
    'ch1.intro.title': '第一章：帕平・揚列雪',
    'ch1.intro.kicker': '第一章・尼泊爾南境',
    'ch1.intro.location': '尼泊爾・帕平谷地（Pharping · Yangleshö）',
    'ch1.intro.era': '約公元八世紀',
    'ch1.intro.narration':
      '三年未降甘霖，帕平谷地赤土龜裂，三處泉眼盡皆乾涸。\n在懸崖下的揚列雪岩洞中，來自烏仗那的蓮花生大士正入甚深禪定，\n調伏盤踞山谷的旱障魔眾，祈請普巴金剛法要以解蒼生焦渴。',
    'ch1.intro.hint': '按任意鍵或點擊繼續',
    'ch1.intro.dismiss': '按任意鍵或點擊繼續',
    'prompt.leaveWild': '按 [E] 離開此區域',

    // Chapter Completion Banner
    'ch1.banner.complete.kicker': '第一章 完成',
    'ch1.banner.complete.title': '「第一章 完成：甘霖普降帕平谷」',
    'ch1.banner.complete.sub': '已解鎖新技能「普巴金剛橛」與第二章傳送點「芒域・吉隆山口」',

    // Interactive Prompts & Toasts
    'prompt.springBasin': '按 [E] 疏通乾涸泉眼',
    'prompt.yangleshoLamp': '按 [E] 點燃揚列雪燈龕',
    'prompt.lightCaveLamp': '按 [E] 點燃揚列雪燈龕',
    'toast.springBlocked': '旱魅仍盤踞泉眼四周，須先度脫泉邊旱魅！',
    'toast.spring.guarded': '旱魅仍盤踞泉眼四周，須先度脫泉邊旱魅！',
    'toast.springCleared': '泉眼石槽湧出清澈細流！（{n}/3）',
    'toast.spring.seep': '甘泉微湧 —— 旱魅退散後，泉眼滲出清涼細流！',
    'toast.yangleshoLampLit': '揚列雪燈龕已點亮（{n}/7）',
    'toast.lamp.lit': '已點亮揚列雪酥油燈（{cur}/{max}）',
    'toast.yangleshoLampBlown': '狂風障魔吹熄了一盞酥油燈！請重新點燃燈龕。',
    'toast.lamp.extinguished': '狂風障魔吹熄了一盞酥油燈！請重新點燃燈龕。',
    'toast.yangleshoWave': '岩洞外刮起燥熱旋風 —— 障魔試圖吹熄供燈！',
    'toast.lamp.wave': '洞外熱風驟起 —— 旱魅與沙塵精正撲向酥油燈！',
    'toast.yangleshoAllLit': '七盞酥油燈齊明，洞中現起蓮花生大士的金色淨相！',
    'toast.lamps.allLit': '七盞酥油燈齊明，洞中現起蓮花生大士的金色淨相！',
    'toast.escortStart': '護送印度行者前往揚列雪洞，提防峽谷伏擊！',
    'toast.escort.start': '護送印度行者前往揚列雪洞，提防峽谷伏擊！',
    'toast.escortRest': '印度行者氣力不支，坐下調息五秒！',
    'toast.escort.resting': '印度行者氣力不支，坐下調息五秒！',
    'toast.escortResume': '印度行者調息完畢，繼續前行。',
    'toast.escort.recovered': '印度行者調息完畢，繼續前行。',
    'toast.escortAmbush': '峽谷砂石飛揚 —— 障魔伏兵現身！',
    'toast.escort.ambush': '峽谷砂石飛揚 —— 障魔伏兵現身！',
    'toast.escortArrived': '印度行者已將《普巴金剛續》經函安然送達揚列雪洞！',
    'toast.escort.arrived': '印度行者已將《普巴金剛續》經函安然送達揚列雪洞！',
    'toast.rainReturned': '烏雲聚攏，甘霖傾盆而下 —— 帕平谷地重獲生機！',
    'toast.illusionDispelled': '六字大明咒金光破除旱障幻影！（剩餘幻影：{n}）',
    'toast.boss.illusionSpawn': '旱障魔主化出三道幻影 —— 唯有六字大明咒（R）能照破妄相！',
    'toast.boss.illusionDispelled': '六字大明咒金光破除旱障幻影！',
    'toast.illusionImmune': '此乃旱障幻影，尋常兵刃難傷 —— 請以六字大明咒（R）照破幻影！',

    // Enemies
    'enemy.droughtSprite': '旱魅',
    'enemy.dustDevil': '沙塵精',
    'enemy.thirstyPreta': '乾渴餓鬼',

    // Boss: Drought Lord
    'boss.droughtLord.name': '旱障魔主',
    'boss.droughtLord.title': '赤岩焦土之障',
    'boss.droughtLord.oath.line1':
      '「嗚呼！金剛橛之威光刺透我心，三界嗔火與慳貪俱化灰燼……」',
    'boss.droughtLord.oath.line2':
      '「烏仗那大士與行者啊，我今誠心降伏，立下金剛誓言：即刻釋放被鎖閉的龍族雲雨，令帕平谷地泉湧林茂，永不再興旱魃之災！」',
    'boss.droughtLord.oath.choice': '「願汝謹守誓言，護持山谷蒼生。」',
    'dlg.boss.droughtLord.oath.1':
      '「嗚呼！普巴金剛橛之無上威光刺透吾心，三界嗔火與焦土妄執俱化灰燼……」',
    'dlg.boss.droughtLord.oath.2':
      '「吾本是棲息於[[codex:asuraCave|阿蘇拉洞]]岩脈之大力非人，因嫉恨烏仗那大士於[[codex:yangleshoCave|揚列雪洞]]修持妙法，遂以嗔火鎖閉龍族雲雨，令帕平三年枯旱。」',
    'dlg.boss.droughtLord.oath.3':
      '「今見[[codex:vajrakilaya|普巴金剛]]慈悲威猛壇城，吾之傲慢已徹底摧破，甘願頂禮臣服！」',
    'dlg.boss.droughtLord.oath.4':
      '「吾在此立下不壞金剛誓言：即刻釋放被鎖閉的漫天甘霖，令[[codex:pharping|帕平]]谷地三泉湧流、萬木復甦，永為護持修行者之山神！」',
    'dlg.boss.droughtLord.oath.accept': '「善哉，願汝謹守三昧耶誓言，護佑山谷蒼生。」',

    // NPCs
    'npc.villageElder': '帕平村長老',
    'npc.pharpingVillager': '帕平村民',
    'npc.pharpingVillager1': '帕平農夫・索南',
    'npc.pharpingVillager2': '帕平織女・卓瑪',
    'npc.guruVision.pharping': '蓮花生大士（淨相）',
    'npc.messenger': '印度行者',

    // Quests
    'quest.chapter.1': '第一章：帕平・揚列雪',

    'quest.ch1.drought.title': '乾旱之谷',
    'quest.ch1.drought.desc':
      '帕平谷地三年未雨，三處古老泉眼被旱魅封堵。向村長老了解災情，度脫三處泉眼周邊的旱魅並疏通泉槽。',
    'quest.ch1.drought.step.talkElder1': '與帕平村長老交談，了解三年大旱之苦',
    'quest.ch1.drought.step.talk_elder': '與帕平村長老交談，了解三年大旱之苦',
    'quest.ch1.drought.step.liberateSprings': '度脫三處泉眼周邊的旱魅',
    'quest.ch1.drought.step.liberate_sprites': '度脫三處泉眼周邊的旱魅',
    'quest.ch1.drought.step.interactSprings': '疏通帕平谷地的三處乾涸泉眼',
    'quest.ch1.drought.step.interact_springs': '疏通帕平谷地的三處乾涸泉眼',
    'quest.ch1.drought.step.talkElder2': '返回帕平村向長老回報泉眼微湧之事',
    'quest.ch1.drought.step.report_elder': '返回帕平村向長老回報泉眼微湧之事',

    'quest.ch1.lamps.title': '揚列雪的燈',
    'quest.ch1.lamps.desc':
      '長老提及懸崖下的揚列雪岩洞中有烏仗那修行者入定。前往揚列雪洞並點燃七處岩壁燈龕，護持供燈不被障魔吹熄。',
    'quest.ch1.lamps.step.reachCave': '前往懸崖下的揚列雪洞',
    'quest.ch1.lamps.step.reach_cave': '前往懸崖下的揚列雪洞',
    'quest.ch1.lamps.step.lightLamps': '點燃揚列雪洞內的七處酥油燈龕（7 盞齊明）',
    'quest.ch1.lamps.step.light_lamps': '點燃揚列雪洞內的七處酥油燈龕（7 盞齊明）',
    'quest.ch1.lamps.step.talkGuru': '與洞中顯現的蓮花生大士淨相交談',
    'quest.ch1.lamps.step.talk_vision': '與洞中顯現的蓮花生大士淨相交談',

    'quest.ch1.scrolls.title': '來自印度的經函',
    'quest.ch1.scrolls.desc':
      '蓮師請人自印度迎請《普巴金剛續》經函以對治旱障。前往西側峽谷入口接應印度行者，護送他穿越峽谷抵達揚列雪洞。',
    'quest.ch1.scrolls.step.talkMessenger': '在西側峽谷入口與背負經函的印度行者會合',
    'quest.ch1.scrolls.step.find_messenger': '在西側峽谷入口與背負經函的印度行者會合',
    'quest.ch1.scrolls.step.escortMessenger': '護送印度行者沿峽谷古道抵達揚列雪洞',
    'quest.ch1.scrolls.step.escort_messenger': '護送印度行者沿峽谷古道抵達揚列雪洞',
    'quest.ch1.scrolls.step.talkGuru': '向蓮花生大士淨相呈遞《普巴金剛續》經函',
    'quest.ch1.scrolls.step.deliver_scrolls': '向蓮花生大士淨相呈遞《普巴金剛續》經函',

    'quest.ch1.kilaya.title': '普巴金剛',
    'quest.ch1.kilaya.desc':
      '普巴金剛法要已圓滿齊備。登上北側上方的阿蘇拉洞調伏旱障魔主，令甘霖重降帕平谷地。',
    'quest.ch1.kilaya.step.reachAsura': '登上北側懸崖的阿蘇拉洞壇城',
    'quest.ch1.kilaya.step.reach_asura': '登上北側懸崖的阿蘇拉洞壇城',
    'quest.ch1.kilaya.step.subdueBoss': '調伏盤踞阿蘇拉洞的旱障魔主',
    'quest.ch1.kilaya.step.subdue_boss': '調伏盤踞阿蘇拉洞的旱障魔主',
    'quest.ch1.kilaya.step.talkGuru': '返回揚列雪洞領受蓮花生大士的普巴金剛教授',
    'quest.ch1.kilaya.step.report_vision': '返回揚列雪洞領受蓮花生大士的普巴金剛教授',

    // Dialogues
    // C1-1 Village Elder
    'ch1.elder.droughtIntro.1':
      '「遠方來的行者啊，願三寶護佑你。你雙足踏上的這片[[codex:pharping|帕平]]谷地，已經整整三年沒有落下一滴雨水了。」',
    'ch1.elder.droughtIntro.2':
      '「山谷裡的三處古泉眼被熾熱的旱魅盤踞，石槽乾裂，田疇枯焦。老朽懇請你前往三處泉眼，以慈悲咒力驅散旱魅，疏通石槽，哪怕能引出一絲活水也好！」',
    'ch1.elder.droughtIntro.choice1': '「長老請寬心，我這便前往三處泉眼。」',

    'ch1.elder.droughtActive.1':
      '「三處泉眼分別在村莊西南方、東南方與正南谷地。先度脫盤踞泉邊的旱魅，再查看泉眼石槽吧。」',
    'ch1.elder.droughtActive.choice1': '「我明白。」',

    'ch1.elder.droughtReport.1':
      '「啊！石槽中竟重新滲出清涼的水珠，村裡的古井也有了濕氣！行者，你真是帕平谷地的恩人。」',
    'ch1.elder.droughtReport.2':
      '「然而山巔的熱浪仍未消退。聽聞近日有一位來自烏仗那的偉大修行者，正在東南懸崖下的[[codex:yangleshoCave|揚列雪洞]]中閉關入定。若能點亮洞中七盞供燈祈請，必能感得大士指引。」',
    'ch1.elder.droughtReport.choice1': '「我即刻前往揚列雪洞點燈祈請。」',

    'ch1.elder.afterRain.1':
      '「看那漫天甘霖！枯木抽芽，三泉滿溢，帕平谷地終於得救了。世代村民都將銘記蓮師與行者的恩德！」',
    'ch1.elder.afterRain.choice1': '「願風調雨順，眾生安樂。」',

    'ch1.villager.talk.dry':
      '「三年大旱，連井底的泥土都乾裂如鐵……聽說東南方的[[codex:yangleshoCave|揚列雪洞]]裡有聖者入定，不知何時才能降下甘霖？」',
    'ch1.villager.talk.rain':
      '「下雨了！真的下雨了！泉水重新湧出，梯田裡的青苗都活過來了！」',
    'ch1.villager.talk.choice': '「吉祥如意。」',

    // C1-2 Guru Vision in Yangleshö Cave
    'ch1.guru.lampsDone.1':
      '「善哉，具信的行者。七盞智慧明燈照亮了[[codex:yangleshoCave|揚列雪洞]]，也照見了籠罩此谷的無明障雲。」',
    'ch1.guru.lampsDone.2':
      '「我在修持大樂蓮師法門時，山谷中的[[codex:droughtLegend|旱障魔眾]]以嗔火鎖閉雲雨、百般撓亂。要摧伏此等猛烈障礙，須以[[codex:vajrakilaya|普巴金剛]]（金剛童子）之威猛事業方能成辦。」',
    'ch1.guru.lampsDone.3':
      '「我已遣使自印度那爛陀迎請《普巴金剛續》經函。那位背負經函的印度行者正抵達西側峽谷入口，卻遭沙塵精與旱魅圍困。請你速去接應，護送他來到洞中。」',
    'ch1.guru.lampsDone.choice1': '「謹遵上師教言，我立刻前往西側峽谷接應！」',

    // C1-3 Messenger & Guru Scrolls
    'ch1.messenger.meet.1':
      '「呼……謝天謝地！我自印度一路兼程，背上負著蓮師囑託的《[[codex:vajrakilaya|普巴金剛]]續》梵夾，但這峽谷裡狂沙蔽日、障魔四起，我實在寸步難行。」',
    'ch1.messenger.meet.2':
      '「請你在前方開路護持！若我途中氣力不支，只需坐下調息片刻便能再行。」',
    'ch1.messenger.meet.choice1': '「請隨我來，我會護送你安全抵達揚列雪洞。」',

    'ch1.messenger.escorting.1':
      '「揚列雪洞就在峽谷東端，請小心沿途伏擊的沙塵精與旱魅！」',
    'ch1.messenger.escorting.choice1': '「跟緊我！」',

    'ch1.messenger.arrived.1':
      '「《普巴金剛續》經函分毫未損，終於送抵揚列雪洞了！快向蓮師稟報吧。」',
    'ch1.messenger.arrived.choice1': '「辛苦你了。」',

    'ch1.guru.scrollsDone.1':
      '「《[[codex:vajrakilaya|普巴金剛]]》法要既至，緣起已然具足。所謂『普巴』（[[codex:phurba|普巴橛]]），三棱鋒刃並非外傷眾生之兵器，而是直刺貪、嗔、癡三毒根本的慈悲智慧。」',
    'ch1.guru.scrollsDone.2':
      '「旱障魔主此刻正退守北側懸崖上方的[[codex:asuraCave|阿蘇拉洞]]，以焦土幻相惑亂人心。當牠化出三重幻影時，切記以六字大明咒之真言光明照破幻相，直取本體！」',
    'ch1.guru.scrollsDone.choice1': '「頂禮上師，我這便登臨阿蘇拉洞調伏旱障！」',

    'ch1.guru.kilayaActive.1':
      '「北側懸崖上的[[codex:asuraCave|阿蘇拉洞]]便是旱障魔主盤踞之處。以定慧雙運之心前往調伏吧。」',
    'ch1.guru.kilayaActive.choice1': '「謹記在心。」',

    // C1-4 Final Teaching & Chapter Completion
    'ch1.guru.kilayaDone.1':
      '「善哉！你看帕平谷地甘霖普降，焦土化為青疇，三處泉眼再度湧流不息。」',
    'ch1.guru.kilayaDone.2':
      '「行者當知：外在的旱災與障礙，皆由眾生內心的執著與瞋恨所感召。[[codex:phurba|普巴金剛橛]]所釘住的，正是我執與煩惱的動搖之心。當嗔火轉為事業智慧，障礙本身即是成就的助伴。」',
    'ch1.guru.kilayaDone.3':
      '「今授汝『普巴金剛橛』密印，並留此《揚列雪之橛》伏藏法器。北方吐蕃國王赤松德贊之迎請使者已至[[codex:pharping|帕平]]北方山口，前往芒域・吉隆山口，踏上翻越喜馬拉雅的旅途吧！」',
    'ch1.guru.kilayaDone.choice1': '「頂禮蓮師！弟子領受法要，啟程北上。」',

    'ch1.guru.completed.1':
      '「揚列雪的大手印與普巴金剛雙運成就已永駐此巖。願汝持守金剛定力，利益雪域有情。」',
    'ch1.guru.completed.choice1': '「頂禮蓮花生大士。」',

    // Canonical dlg.ch1.* aliases used by src/data/dialogues/ch1.js
    'dlg.ch1.elder.droughtIntro.1':
      '「遠方來的行者啊，願三寶護佑你。你雙足踏上的這片[[codex:pharping|帕平]]谷地，已經整整三年沒有落下一滴雨水了。」',
    'dlg.ch1.elder.droughtIntro.2':
      '「山谷裡的三處古泉眼被熾熱的旱魅盤踞，石槽乾裂，田疇枯焦。老朽懇請你前往三處泉眼，以慈悲咒力驅散旱魅，疏通石槽，哪怕能引出一絲活水也好！」',
    'dlg.ch1.elder.droughtIntro.choice.accept': '「長老請寬心，我這便前往三處泉眼。」',
    'dlg.ch1.elder.droughtIntro.choice.ask': '「請問這場三年大旱是如何引起的？」',
    'dlg.ch1.elder.droughtIntro.askReply':
      '「據傳有來自烏仗那的大士在懸崖下的[[codex:yangleshoCave|揚列雪洞]]修持殊勝法門，山谷中的[[codex:droughtLegend|旱障魔眾]]心生嫉恨，鎖閉了雲雨。唯有先清淨三處古泉，再去祈請大士方有轉機啊！」',
    'dlg.ch1.elder.droughtActive.1':
      '「三處泉眼分別在村莊西南方、東南方與正南谷地。先度脫盤踞泉邊的旱魅，再查看泉眼石槽吧。」',
    'dlg.ch1.elder.droughtActive.choice.ok': '「我明白。」',
    'dlg.ch1.elder.droughtReport.1':
      '「啊！石槽中竟重新滲出清涼的水珠，村裡的古井也有了濕氣！行者，你真是帕平谷地的恩人。」',
    'dlg.ch1.elder.droughtReport.2':
      '「然而山巔的熱浪仍未消退。聽聞近日有一位來自烏仗那的偉大修行者，正在東南懸崖下的[[codex:yangleshoCave|揚列雪洞]]中閉關入定。若能點亮洞中七盞供燈祈請，必能感得大士指引。」',
    'dlg.ch1.elder.droughtReport.choice.accept': '「我即刻前往揚列雪洞點燈祈請。」',
    'dlg.ch1.elder.afterRain.1':
      '「看那漫天甘霖！枯木抽芽，三泉滿溢，帕平谷地終於得救了。世代村民都將銘記蓮師與行者的恩德！」',
    'dlg.ch1.elder.afterRain.choice.ok': '「願風調雨順，眾生安樂。」',
    'dlg.ch1.villager1.dry':
      '「三年大旱，連井底的泥土都乾裂如鐵……聽說東南方的[[codex:yangleshoCave|揚列雪洞]]裡有聖者入定，不知何時才能降下甘霖？」',
    'dlg.ch1.villager1.rain':
      '「下雨了！真的下雨了！泉水重新湧出，梯田裡的青苗都活過來了！」',
    'dlg.ch1.villager2.dry':
      '「田裡的莊稼全枯了，山上的[[codex:asuraCave|阿蘇拉洞]]每天還吹來陣陣灼人的熱風，請行者務必當心。」',
    'dlg.ch1.villager2.rain':
      '「甘霖普降，清涼的雨水洗淨了整座[[codex:pharping|帕平]]山谷，感恩蓮師與行者的慈悲！」',
    'dlg.ch1.vision.lampsTalk.1':
      '「善哉，具信的行者。七盞智慧明燈照亮了[[codex:yangleshoCave|揚列雪洞]]，也照見了籠罩此谷的無明障雲。」',
    'dlg.ch1.vision.lampsTalk.2':
      '「我在修持大樂蓮師法門時，山谷中的[[codex:droughtLegend|旱障魔眾]]以嗔火鎖閉雲雨、百般撓亂。要摧伏此等猛烈障礙，須以[[codex:vajrakilaya|普巴金剛]]（金剛童子）之威猛事業方能成辦。」',
    'dlg.ch1.vision.lampsTalk.3':
      '「我已遣使自印度那爛陀迎請《普巴金剛續》經函。那位背負經函的印度行者正抵達西側峽谷入口，卻遭沙塵精與旱魅圍困。請你速去接應，護送他來到洞中。」',
    'dlg.ch1.vision.lampsTalk.choice.accept': '「謹遵上師教言，我立刻前往西側峽谷接應！」',
    'dlg.ch1.vision.scrollsActive.1':
      '「背負《[[codex:vajrakilaya|普巴金剛]]續》的印度行者正在西側峽谷入口等候，請速去護送他穿過峽谷。」',
    'dlg.ch1.vision.scrollsActive.choice.ok': '「弟子即刻前往。」',
    'dlg.ch1.messenger.start.1':
      '「呼……謝天謝地！我自印度一路兼程，背上負著蓮師囑託的《[[codex:vajrakilaya|普巴金剛]]續》梵夾，但這峽谷裡狂沙蔽日、障魔四起，我實在寸步難行。」',
    'dlg.ch1.messenger.start.2':
      '「請你在前方開路護持！若我途中氣力不支，只需坐下調息片刻便能再行。」',
    'dlg.ch1.messenger.start.choice.escort': '「請隨我來，我會護送你安全抵達揚列雪洞。」',
    'dlg.ch1.messenger.escorting':
      '「揚列雪洞就在峽谷東端，請小心沿途伏擊的沙塵精與旱魅！」',
    'dlg.ch1.messenger.arrived':
      '「《普巴金剛續》經函分毫未損，終於送抵揚列雪洞了！快向蓮師稟報吧。」',
    'dlg.ch1.vision.scrollsDeliver.1':
      '「《[[codex:vajrakilaya|普巴金剛]]》法要既至，緣起已然具足。所謂『普巴』（[[codex:phurba|普巴橛]]），三棱鋒刃並非外傷眾生之兵器，而是直刺貪、嗔、癡三毒根本的慈悲智慧。」',
    'dlg.ch1.vision.scrollsDeliver.2':
      '「旱障魔主此刻正退守北側懸崖上方的[[codex:asuraCave|阿蘇拉洞]]，以焦土幻相惑亂人心。」',
    'dlg.ch1.vision.scrollsDeliver.3':
      '「當牠化出三重幻影時，切記以六字大明咒之真言光明照破幻相，直取本體！」',
    'dlg.ch1.vision.scrollsDeliver.choice.accept': '「頂禮上師，我這便登臨阿蘇拉洞調伏旱障！」',
    'dlg.ch1.vision.kilayaActive.1':
      '「北側懸崖上的[[codex:asuraCave|阿蘇拉洞]]便是旱障魔主盤踞之處。以定慧雙運之心前往調伏吧。」',
    'dlg.ch1.vision.kilayaActive.choice.ok': '「謹記在心。」',
    'dlg.ch1.vision.kilayaComplete.1':
      '「善哉！你看帕平谷地甘霖普降，焦土化為青疇，三處泉眼再度湧流不息。」',
    'dlg.ch1.vision.kilayaComplete.2':
      '「行者當知：外在的旱災與障礙，皆由眾生內心的執著與瞋恨所感召。[[codex:phurba|普巴金剛橛]]所釘住的，正是我執與煩惱的動搖之心。當嗔火轉為事業智慧，障礙本身即是成就的助伴。」',
    'dlg.ch1.vision.kilayaComplete.3':
      '「今授汝『普巴金剛橛』密印，並留此《揚列雪之橛》伏藏法器。北方吐蕃國王赤松德贊之迎請使者已至[[codex:pharping|帕平]]北方山口，前往芒域・吉隆山口，踏上翻越喜馬拉雅的旅途吧！」',
    'dlg.ch1.vision.kilayaComplete.choice.complete': '「頂禮蓮師！弟子領受法要，啟程北上。」',
    'dlg.ch1.vision.done.1':
      '「揚列雪的大手印與普巴金剛雙運成就已永駐此巖。願汝持守金剛定力，利益雪域有情。」',
    'dlg.ch1.vision.done.choice.ok': '「頂禮蓮花生大士。」',

    // 6 Chapter 1 Codex Entries (150-300 chars each in zh-Hant)
    'codex.pharping.title': '帕平（Pharping）',
    'codex.pharping.body':
      '〔史實〕帕平位於尼泊爾加德滿都谷地南緣的高山谷地，海拔約一千七百公尺，自古為連接尼泊爾與印度的交通要道及佛教聖地。此地擁有鬱蔥梯田、古老村落與多處天然岩洞，其中最負盛名者即揚列雪洞與阿蘇拉洞。公元八世紀，蓮花生大士受邀入藏弘法前曾駐錫帕平閉關修持，將此地加持為藏傳佛教金剛乘極為尊崇的成就聖地，至今朝聖者絡繹不絕。',

    'codex.yangleshoCave.title': '揚列雪洞（Yangleshö Cave）',
    'codex.yangleshoCave.body':
      '〔史實〕揚列雪洞位於尼泊爾帕平谷地南側懸崖下，為一處半開放式的天然石灰岩洞窟，緊鄰湧泉與古樹。相傳蓮花生大士於公元八世紀在此與釋迦德瓦公主共同修持清淨嘿嚕嘎（大樂蓮師）法門，並結合普巴金剛法要證得大手印殊勝成就。洞內至今供奉蓮師像與常明酥油燈龕，與印度菩提伽耶金剛座同被寧瑪派視為無上加持之聖境。',

    'codex.asuraCave.title': '阿蘇拉洞（Asura Cave）',
    'codex.asuraCave.body':
      '〔史實〕阿蘇拉洞位於帕平揚列雪上方的陡峭山崖處，需拾級攀登方能抵達。蓮花生大士在揚列雪閉關期間，亦曾於此上洞入甚深禪定，調伏阻撓修行的非人與旱魃障礙。相傳洞口岩石上留有蓮師及普巴金剛壇城之自生聖跡。此洞地勢險峻、視野遼闊，俯瞰整座帕平山谷，至今仍是藏傳佛教行者進行長期嚴格閉關的重要道場。',

    'codex.vajrakilaya.title': '普巴金剛（Vajrakīlaya）',
    'codex.vajrakilaya.body':
      '〔史實〕普巴金剛，梵名金剛童子（Vajrakumāra），為藏傳佛教寧瑪派八大法行（修部八教）中最具威猛除障力的本尊。其法門源自印度密續《普巴金剛根本續》，旨在以金剛般堅固的慈悲與智慧，徹底斷除修行道上的內外違緣與三毒習氣。蓮花生大士於帕平揚列雪修持時，特從印度迎請普巴金剛法要，開創大樂與除障雙運之傳承。',

    'codex.phurba.title': '普巴橛（Phurba / Kīla）',
    'codex.phurba.body':
      '〔史實〕普巴橛（梵語 Kīla，藏語 Phur-ba）為藏傳佛教重要的儀式法器，外型上端為三面忿怒本尊頭像與金剛杵柄，下端為摩羯魚口吐出的三棱錐刃。三棱刃象徵斷除貪、嗔、癡三毒，以及調伏過去、現在、未來三世之無明妄念。「普巴」字義為釘與橛，代表以如如不動的禪定力將散亂執著之心釘入法界本性，轉煩惱為菩提事業。',

    'codex.droughtLegend.title': '帕平平旱傳說',
    'codex.droughtLegend.body':
      '〔傳說〕據《蓮花生大士本生傳》與伏藏史料記載，蓮師於尼泊爾帕平揚列雪洞修持真實意法門時，當地大力非人與魔眾心生嫉恨，鎖閉雲雨，致使尼泊爾與印藏邊境連年大旱、饑饉遍地。蓮師遂遣使赴印度迎請《普巴金剛續》，經函甫抵山谷，蓮師即現普巴金剛威猛身壇城，一舉調伏旱障魔主並令其立誓護法，頃刻甘霖普降、萬物復甦。',
  },

  en: {
    // Map & Pure Vision Intro Card
    'map.pharping': 'Pharping · Yangleshö',
    'toast.enterPharping': 'Entered Pharping Valley — Parched by three years of drought',
    'ch1.intro.title': 'Chapter I: Pharping · Yangleshö',
    'ch1.intro.kicker': 'Chapter I · Southern Rim of Kathmandu',
    'ch1.intro.location': 'Pharping Valley, Nepal',
    'ch1.intro.era': 'Circa 8th Century CE',
    'ch1.intro.narration':
      'For three long years not a drop of rain has fallen upon Pharping; its three ancient springs lie dry and cracked.\nBeneath the southern cliffs in Yangleshö Cave, Padmasambhava of Oddiyana abides in deep samādhi,\nsubduing the drought-causing spirits and awaiting the Vajrakīlaya tantras to restore life to the valley.',
    'ch1.intro.hint': 'Press any key or click to continue',
    'ch1.intro.dismiss': 'Press any key or click to continue',
    'prompt.leaveWild': 'Press [E] to leave this area',

    // Chapter Completion Banner
    'ch1.banner.complete.kicker': 'Chapter I Complete',
    'ch1.banner.complete.title': '"Chapter I Complete: Rain Returns to Pharping"',
    'ch1.banner.complete.sub': 'Unlocked Skill "Vajra Phurba" & Chapter II Waypoint "Mangyul · Kyirong Pass"',

    // Interactive Prompts & Toasts
    'prompt.springBasin': 'Press [E] to clear the dry spring basin',
    'prompt.yangleshoLamp': 'Press [E] to light Yangleshö Lamp Niche',
    'prompt.lightCaveLamp': 'Press [E] to light Yangleshö Lamp Niche',
    'toast.springBlocked': 'Drought Sprites still haunt this spring — liberate them first!',
    'toast.spring.guarded': 'Drought Sprites still haunt this spring — liberate them first!',
    'toast.springCleared': 'A cool trickle of water seeps into the stone basin! ({n}/3)',
    'toast.spring.seep': 'Cool water seeps forth into the stone basin as the Drought Sprites disperse!',
    'toast.yangleshoLampLit': 'Yangleshö butter lamp niche lit ({n}/7)',
    'toast.lamp.lit': 'Yangleshö butter lamp niche lit ({cur}/{max})',
    'toast.yangleshoLampBlown': 'An obstacle spirit blew out a butter lamp! Relight the niche.',
    'toast.lamp.extinguished': 'An obstacle spirit blew out a butter lamp! Relight the niche.',
    'toast.yangleshoWave': 'Scorching winds swirl outside — obstacle spirits rush toward the lamps!',
    'toast.lamp.wave': 'Scorching winds swirl outside — obstacle spirits rush toward the lamps!',
    'toast.yangleshoAllLit': 'All seven lamp niches shine bright — a Pure Vision of Guru Rinpoche manifests!',
    'toast.lamps.allLit': 'All seven lamp niches shine bright — a Pure Vision of Guru Rinpoche manifests!',
    'toast.escortStart': 'Escort the Indian Messenger through the canyon to Yangleshö Cave!',
    'toast.escort.start': 'Escort the Indian Messenger through the canyon to Yangleshö Cave!',
    'toast.escortRest': 'The Indian Messenger is exhausted and sits to catch his breath for 5s!',
    'toast.escort.resting': 'The Indian Messenger is exhausted and sits to catch his breath for 5s!',
    'toast.escortResume': 'The Indian Messenger has recovered and resumes walking.',
    'toast.escort.recovered': 'The Indian Messenger has recovered and resumes walking.',
    'toast.escortAmbush': 'Dust swirls in the canyon — obstacle ambush ahead!',
    'toast.escort.ambush': 'Dust swirls in the canyon — obstacle ambush ahead!',
    'toast.escortArrived': 'The Indian Messenger has safely delivered the Vajrakīlaya texts to Yangleshö Cave!',
    'toast.escort.arrived': 'The Indian Messenger has safely delivered the Vajrakīlaya texts to Yangleshö Cave!',
    'toast.rainReturned': 'Rainclouds gather and gentle rain pours down — Pharping Valley blooms anew!',
    'toast.illusionDispelled': 'The Six-Syllable Mantra dispels a Drought Illusion! (Remaining: {n})',
    'toast.boss.illusionSpawn': 'The Drought Lord splits into three illusions — cast the Six-Syllable Mantra (R) to dispel them!',
    'toast.boss.illusionDispelled': 'The Six-Syllable Mantra dispels the Drought Illusions!',
    'toast.illusionImmune': 'This is a mirage illusion — cast the Six-Syllable Mantra (R) to dispel it!',

    // Enemies
    'enemy.droughtSprite': 'Drought Sprite',
    'enemy.dustDevil': 'Dust Devil',
    'enemy.thirstyPreta': 'Parched Preta',

    // Boss: Drought Lord
    'boss.droughtLord.name': 'Drought Lord',
    'boss.droughtLord.title': 'Obstacle of Scorched Earth',
    'boss.droughtLord.oath.line1':
      '"Alas! The blazing Phurba of Vajrakīlaya pierces my heart — my wrath and greed crumble into ash..."',
    'boss.droughtLord.oath.line2':
      '"Great Master of Oddiyana and noble practitioner, I bow in subjugation and swear this Vajra Oath: I release the imprisoned rain-clouds at once, so Pharping\'s springs and forests may flourish forevermore!"',
    'boss.droughtLord.oath.choice': '"Keep your oath and guard the beings of this valley."',
    'dlg.boss.droughtLord.oath.1':
      '"Alas! The blazing Phurba of [[codex:vajrakilaya|Vajrakīlaya]] pierces my heart — my three-realm wrath and scorching delusion crumble into ash..."',
    'dlg.boss.droughtLord.oath.2':
      '"I am the spirit-lord dwelling within the crags of [[codex:asuraCave|Asura Cave]]. Envious of the Master of Oddiyana meditating in [[codex:yangleshoCave|Yangleshö Cave]], I locked away the rain-clouds and parched this valley for three years."',
    'dlg.boss.droughtLord.oath.3':
      '"Beholding the wrathful compassion of the Vajrakīlaya mandala, my pride is shattered and I bow in complete submission!"',
    'dlg.boss.droughtLord.oath.4':
      '"I swear an unbreakable Vajra Oath: I release the imprisoned rain-clouds at once, so the three springs and forests of [[codex:pharping|Pharping]] flourish forevermore!"',
    'dlg.boss.droughtLord.oath.accept': '"Abide by your Samaya vow and guard all beings of this valley."',

    // NPCs
    'npc.villageElder': 'Pharping Village Elder',
    'npc.pharpingVillager': 'Pharping Villager',
    'npc.pharpingVillager1': 'Pharping Farmer Sonam',
    'npc.pharpingVillager2': 'Pharping Weaver Dolma',
    'npc.guruVision.pharping': 'Guru Rinpoche (Pure Vision)',
    'npc.messenger': 'Indian Messenger',

    // Quests
    'quest.chapter.1': 'Chapter I: Pharping · Yangleshö',

    'quest.ch1.drought.title': 'Valley of Drought',
    'quest.ch1.drought.desc':
      'Pharping Valley has suffered three years without rain, and its three springs are choked by Drought Sprites. Speak with the Village Elder, liberate the sprites at all three springs, and clear the stone basins.',
    'quest.ch1.drought.step.talkElder1': 'Speak with the Pharping Village Elder about the three-year drought',
    'quest.ch1.drought.step.talk_elder': 'Speak with the Pharping Village Elder about the three-year drought',
    'quest.ch1.drought.step.liberateSprings': 'Liberate the Drought Sprites around the three springs',
    'quest.ch1.drought.step.liberate_sprites': 'Liberate the Drought Sprites around the three springs',
    'quest.ch1.drought.step.interactSprings': 'Clear the three dry spring basins so water seeps forth',
    'quest.ch1.drought.step.interact_springs': 'Clear the three dry spring basins so water seeps forth',
    'quest.ch1.drought.step.talkElder2': 'Report back to the Pharping Village Elder',
    'quest.ch1.drought.step.report_elder': 'Report back to the Pharping Village Elder',

    'quest.ch1.lamps.title': 'Lamps of Yangleshö',
    'quest.ch1.lamps.desc':
      'The Elder spoke of a master from Oddiyana meditating in Yangleshö Cave beneath the cliff. Enter the cave and light all 7 butter lamp niches while warding off obstacle spirits.',
    'quest.ch1.lamps.step.reachCave': 'Reach Yangleshö Cave beneath the eastern cliff',
    'quest.ch1.lamps.step.reach_cave': 'Reach Yangleshö Cave beneath the eastern cliff',
    'quest.ch1.lamps.step.lightLamps': 'Light all 7 butter lamp niches in Yangleshö Cave',
    'quest.ch1.lamps.step.light_lamps': 'Light all 7 butter lamp niches in Yangleshö Cave',
    'quest.ch1.lamps.step.talkGuru': 'Speak with the Pure Vision of Guru Rinpoche',
    'quest.ch1.lamps.step.talk_vision': 'Speak with the Pure Vision of Guru Rinpoche',

    'quest.ch1.scrolls.title': 'Scrolls from India',
    'quest.ch1.scrolls.desc':
      'Guru Rinpoche sent for the Vajrakīlaya scriptures from India to subdue the drought obstacles. Meet the Indian Messenger at the Western Canyon entrance and escort him safely to Yangleshö Cave.',
    'quest.ch1.scrolls.step.talkMessenger': 'Meet the Indian Messenger at the Western Canyon entrance',
    'quest.ch1.scrolls.step.find_messenger': 'Meet the Indian Messenger at the Western Canyon entrance',
    'quest.ch1.scrolls.step.escortMessenger': 'Escort the Indian Messenger through the canyon to Yangleshö Cave',
    'quest.ch1.scrolls.step.escort_messenger': 'Escort the Indian Messenger through the canyon to Yangleshö Cave',
    'quest.ch1.scrolls.step.talkGuru': 'Deliver the Vajrakīlaya scriptures to Guru Rinpoche',
    'quest.ch1.scrolls.step.deliver_scrolls': 'Deliver the Vajrakīlaya scriptures to Guru Rinpoche',

    'quest.ch1.kilaya.title': 'Vajrakīlaya',
    'quest.ch1.kilaya.desc':
      'With the Vajrakīlaya teachings complete, ascend to Asura Cave on the northern cliff, subdue the Drought Lord, and restore rain to Pharping Valley.',
    'quest.ch1.kilaya.step.reachAsura': 'Ascend to Asura Cave on the northern cliff',
    'quest.ch1.kilaya.step.reach_asura': 'Ascend to Asura Cave on the northern cliff',
    'quest.ch1.kilaya.step.subdueBoss': 'Subdue the Drought Lord at Asura Cave',
    'quest.ch1.kilaya.step.subdue_boss': 'Subdue the Drought Lord at Asura Cave',
    'quest.ch1.kilaya.step.talkGuru': 'Return to Yangleshö Cave to receive Guru Rinpoche\'s teaching',
    'quest.ch1.kilaya.step.report_vision': 'Return to Yangleshö Cave to receive Guru Rinpoche\'s teaching',

    // Dialogues
    'ch1.elder.droughtIntro.1':
      '"May the Three Jewels bless you, traveler. This valley of [[codex:pharping|Pharping]] beneath your feet has not seen a single drop of rain for three whole years."',
    'ch1.elder.droughtIntro.2':
      '"Fiery Drought Sprites have seized our three ancient springs, leaving the stone basins parched and our terraces barren. Please go to the three springs, liberate those spirits with compassion, and clear the basins so water may seep again!"',
    'ch1.elder.droughtIntro.choice1': '"Rest assured, Elder. I will head to the three springs at once."',

    'ch1.elder.droughtActive.1':
      '"The three springs lie to the southwest, east, and south of our village. Liberate the Drought Sprites around each spring and clear the stone basins."',
    'ch1.elder.droughtActive.choice1': '"I understand."',

    'ch1.elder.droughtReport.1':
      '"Look! Cool water beads are seeping back into the stone basins, and even our village well feels damp again! You have saved our people from despair."',
    'ch1.elder.droughtReport.2':
      '"Yet a scorching malice still clings to the upper cliffs. I heard a great practitioner from Oddiyana is meditating in [[codex:yangleshoCave|Yangleshö Cave]] down the southeastern cliff. If you light the seven lamp niches there, his wisdom vision may guide us."',
    'ch1.elder.droughtReport.choice1': '"I will go to Yangleshö Cave and light the seven lamps."',

    'ch1.elder.afterRain.1':
      '"Behold the blessed rain! Dead branches sprout green leaves and the three springs overflow. Generations in Pharping will remember the grace of the Lotus-Born Master and your deeds!"',
    'ch1.elder.afterRain.choice1': '"May peace and timely rain bless this valley."',

    'ch1.villager.talk.dry':
      '"Three years of drought have baked the soil hard as iron... They say a holy master meditates in [[codex:yangleshoCave|Yangleshö Cave]]. When will the rain return?"',
    'ch1.villager.talk.rain':
      '"It\'s raining! Truly raining! The springs are brimming and the terraced fields are turning green before our eyes!"',
    'ch1.villager.talk.choice': '"Tashi Delek."',

    'ch1.guru.lampsDone.1':
      '"Well done, faithful practitioner. The seven lamps of wisdom illuminate [[codex:yangleshoCave|Yangleshö Cave]] and reveal the cloud of ignorance shrouding this valley."',
    'ch1.guru.lampsDone.2':
      '"While I meditated on Yangdak Heruka, [[codex:droughtLegend|malignant drought spirits]] bound the rain-clouds in anger and stirred up fierce obstacles. To sever such hardened obstructions requires the wrathful compassion of [[codex:vajrakilaya|Vajrakīlaya]]."',
    'ch1.guru.lampsDone.3':
      '"I requested the Vajrakīlaya tantra scrolls from India. The messenger carrying them has just reached the Western Canyon entrance, but Dust Devils and Drought Sprites block his path. Go quickly and escort him here."',
    'ch1.guru.lampsDone.choice1': '"I will head to the Western Canyon and escort him at once!"',

    'ch1.messenger.meet.1':
      '"Thank goodness you are here! I traveled day and night from India carrying the [[codex:vajrakilaya|Vajrakīlaya]] scriptures on my back, but swirling sandstorms and spirits have trapped me in this canyon."',
    'ch1.messenger.meet.2':
      '"Please lead the way! If my strength gives out along the trail, I only need to sit and catch my breath for five seconds before continuing."',
    'ch1.messenger.meet.choice1': '"Stay close — I will escort you safely to Yangleshö Cave."',

    'ch1.messenger.escorting.1':
      '"Yangleshö Cave lies at the eastern end of this canyon. Watch out for ambushes along the rocks!"',
    'ch1.messenger.escorting.choice1': '"Keep moving!"',

    'ch1.messenger.arrived.1':
      '"The Vajrakīlaya scrolls have arrived unharmed at Yangleshö Cave! Please present them to Guru Rinpoche."',
    'ch1.messenger.arrived.choice1': '"Thank you for your perseverance."',

    'ch1.guru.scrollsDone.1':
      '"Now that the [[codex:vajrakilaya|Vajrakīlaya]] scriptures have arrived, all auspicious conditions are complete. Know that the three-bladed [[codex:phurba|Phurba]] is no weapon of harm — it pierces directly through the three poisons of clinging, anger, and delusion."',
    'ch1.guru.scrollsDone.2':
      '"The Drought Lord has retreated to [[codex:asuraCave|Asura Cave]] high on the northern cliff. When its power wanes, it splits into three mirages — shine the Six-Syllable Mantra upon the illusions to dispel them and strike its true form!"',
    'ch1.guru.scrollsDone.choice1': '"I bow to the Guru. I will ascend to Asura Cave and subdue the Drought Lord!"',

    'ch1.guru.kilayaActive.1':
      '"[[codex:asuraCave|Asura Cave]] lies atop the northern cliff. Go forth with unwavering samādhi and compassion."',
    'ch1.guru.kilayaActive.choice1': '"I will."',

    'ch1.guru.kilayaDone.1':
      '"Marvelous! Look how gentle rain pours over Pharping Valley — parched earth turns emerald green and the three springs brim with living water."',
    'ch1.guru.kilayaDone.2':
      '"Remember this, practitioner: outer droughts and obstacles arise from inner clinging and anger. What the [[codex:phurba|Vajra Phurba]] pins down is none other than the restless, self-grasping mind. When anger is transmuted into enlightened activity, obstacles become the very fuel of awakening."',
    'ch1.guru.kilayaDone.3':
      '"I bestow upon you the empowerment of the Vajra Phurba and the Terma relic \'Phurba of Yangleshö\'. Envoys of King Trisong Detsen now await at the northern pass — journey onward to Mangyul · Kyirong Pass and cross the Himalayas into Tibet!"',
    'ch1.guru.kilayaDone.choice1': '"Homage to the Guru! I receive this teaching and set forth northward."',

    'ch1.guru.completed.1':
      '"The union of Mahāmudrā and Vajrakīlaya accomplished at Yangleshö abides forever in this cliff. May your vajra samādhi benefit all beings of the Snow Land."',
    'ch1.guru.completed.choice1': '"Homage to Guru Rinpoche."',

    // Canonical dlg.ch1.* aliases used by src/data/dialogues/ch1.js
    'dlg.ch1.elder.droughtIntro.1':
      '"May the Three Jewels bless you, traveler. This valley of [[codex:pharping|Pharping]] beneath your feet has not seen a single drop of rain for three whole years."',
    'dlg.ch1.elder.droughtIntro.2':
      '"Fiery Drought Sprites have seized our three ancient springs, leaving the stone basins parched and our terraces barren. Please go to the three springs, liberate those spirits with compassion, and clear the basins so water may seep again!"',
    'dlg.ch1.elder.droughtIntro.choice.accept': '"Rest assured, Elder. I will head to the three springs at once."',
    'dlg.ch1.elder.droughtIntro.choice.ask': '"How did this three-year drought begin?"',
    'dlg.ch1.elder.droughtIntro.askReply':
      '"While a great master from Oddiyana meditated in [[codex:yangleshoCave|Yangleshö Cave]], [[codex:droughtLegend|hostile drought spirits]] grew jealous and locked away the rain-clouds. Clear the three springs first, then seek the Master\'s guidance!"',
    'dlg.ch1.elder.droughtActive.1':
      '"The three springs lie to the southwest, east, and south of our village. Liberate the Drought Sprites around each spring and clear the stone basins."',
    'dlg.ch1.elder.droughtActive.choice.ok': '"I understand."',
    'dlg.ch1.elder.droughtReport.1':
      '"Look! Cool water beads are seeping back into the stone basins, and even our village well feels damp again! You have saved our people from despair."',
    'dlg.ch1.elder.droughtReport.2':
      '"Yet a scorching malice still clings to the upper cliffs. I heard a great practitioner from Oddiyana is meditating in [[codex:yangleshoCave|Yangleshö Cave]] down the southeastern cliff. If you light the seven lamp niches there, his wisdom vision may guide us."',
    'dlg.ch1.elder.droughtReport.choice.accept': '"I will go to Yangleshö Cave and light the seven lamps."',
    'dlg.ch1.elder.afterRain.1':
      '"Behold the blessed rain! Dead branches sprout green leaves and the three springs overflow. Generations in Pharping will remember the grace of the Lotus-Born Master and your deeds!"',
    'dlg.ch1.elder.afterRain.choice.ok': '"May peace and timely rain bless this valley."',
    'dlg.ch1.villager1.dry':
      '"Three years of drought have baked the soil hard as iron... They say a holy master meditates in [[codex:yangleshoCave|Yangleshö Cave]]. When will the rain return?"',
    'dlg.ch1.villager1.rain':
      '"It\'s raining! Truly raining! The springs are brimming and the terraced fields are turning green before our eyes!"',
    'dlg.ch1.villager2.dry':
      '"Our crops have withered, and scorching gusts blow down from [[codex:asuraCave|Asura Cave]] on the upper cliff every day. Please stay safe, traveler."',
    'dlg.ch1.villager2.rain':
      '"Sweet rain washes over all of [[codex:pharping|Pharping]] Valley! Praise be to Guru Rinpoche and your compassionate deeds!"',
    'dlg.ch1.vision.lampsTalk.1':
      '"Well done, faithful practitioner. The seven lamps of wisdom illuminate [[codex:yangleshoCave|Yangleshö Cave]] and reveal the cloud of ignorance shrouding this valley."',
    'dlg.ch1.vision.lampsTalk.2':
      '"While I meditated on Yangdak Heruka, [[codex:droughtLegend|malignant drought spirits]] bound the rain-clouds in anger and stirred up fierce obstacles. To sever such hardened obstructions requires the wrathful compassion of [[codex:vajrakilaya|Vajrakīlaya]]."',
    'dlg.ch1.vision.lampsTalk.3':
      '"I requested the Vajrakīlaya tantra scrolls from India. The messenger carrying them has just reached the Western Canyon entrance, but Dust Devils and Drought Sprites block his path. Go quickly and escort him here."',
    'dlg.ch1.vision.lampsTalk.choice.accept': '"I will head to the Western Canyon and escort him at once!"',
    'dlg.ch1.vision.scrollsActive.1':
      '"The Indian Messenger carrying the [[codex:vajrakilaya|Vajrakīlaya]] tantras awaits at the Western Canyon entrance. Escort him safely through the canyon."',
    'dlg.ch1.vision.scrollsActive.choice.ok': '"I am on my way."',
    'dlg.ch1.messenger.start.1':
      '"Thank goodness you are here! I traveled day and night from India carrying the [[codex:vajrakilaya|Vajrakīlaya]] scriptures on my back, but swirling sandstorms and spirits have trapped me in this canyon."',
    'dlg.ch1.messenger.start.2':
      '"Please lead the way! If my strength gives out along the trail, I only need to sit and catch my breath for five seconds before continuing."',
    'dlg.ch1.messenger.start.choice.escort': '"Stay close — I will escort you safely to Yangleshö Cave."',
    'dlg.ch1.messenger.escorting':
      '"Yangleshö Cave lies at the eastern end of this canyon. Watch out for ambushes along the rocks!"',
    'dlg.ch1.messenger.arrived':
      '"The Vajrakīlaya scrolls have arrived unharmed at Yangleshö Cave! Please present them to Guru Rinpoche."',
    'dlg.ch1.vision.scrollsDeliver.1':
      '"Now that the [[codex:vajrakilaya|Vajrakīlaya]] scriptures have arrived, all auspicious conditions are complete. Know that the three-bladed [[codex:phurba|Phurba]] is no weapon of harm — it pierces directly through the three poisons of clinging, anger, and delusion."',
    'dlg.ch1.vision.scrollsDeliver.2':
      '"The Drought Lord has retreated to [[codex:asuraCave|Asura Cave]] high on the northern cliff, conjuring scorching mirages."',
    'dlg.ch1.vision.scrollsDeliver.3':
      '"When its power wanes, it splits into three mirages — shine the Six-Syllable Mantra upon the illusions to dispel them and strike its true form!"',
    'dlg.ch1.vision.scrollsDeliver.choice.accept': '"I bow to the Guru. I will ascend to Asura Cave and subdue the Drought Lord!"',
    'dlg.ch1.vision.kilayaActive.1':
      '"[[codex:asuraCave|Asura Cave]] lies atop the northern cliff. Go forth with unwavering samādhi and compassion."',
    'dlg.ch1.vision.kilayaActive.choice.ok': '"I will."',
    'dlg.ch1.vision.kilayaComplete.1':
      '"Marvelous! Look how gentle rain pours over Pharping Valley — parched earth turns emerald green and the three springs brim with living water."',
    'dlg.ch1.vision.kilayaComplete.2':
      '"Remember this, practitioner: outer droughts and obstacles arise from inner clinging and anger. What the [[codex:phurba|Vajra Phurba]] pins down is none other than the restless, self-grasping mind. When anger is transmuted into enlightened activity, obstacles become the very fuel of awakening."',
    'dlg.ch1.vision.kilayaComplete.3':
      '"I bestow upon you the empowerment of the Vajra Phurba and the Terma relic \'Phurba of Yangleshö\'. Envoys of King Trisong Detsen now await at the northern pass — journey onward to Mangyul · Kyirong Pass and cross the Himalayas into Tibet!"',
    'dlg.ch1.vision.kilayaComplete.choice.complete': '"Homage to the Guru! I receive this teaching and set forth northward."',
    'dlg.ch1.vision.done.1':
      '"The union of Mahāmudrā and Vajrakīlaya accomplished at Yangleshö abides forever in this cliff. May your vajra samādhi benefit all beings of the Snow Land."',
    'dlg.ch1.vision.done.choice.ok': '"Homage to Guru Rinpoche."',

    // 6 Chapter 1 Codex Entries
    'codex.pharping.title': 'Pharping',
    'codex.pharping.body':
      '[History] Located on the southern rim of the Kathmandu Valley in Nepal at roughly 1,700 meters elevation, Pharping is an ancient Himalayan trade corridor and one of Vajrayāna Buddhism\'s most sacred pilgrimage sites. Surrounded by terraced hills, springs, and limestone caverns—most notably Yangleshö and Asura Caves—it was here in the 8th century that Padmasambhava meditated before journeying to Tibet.',

    'codex.yangleshoCave.title': 'Yangleshö Cave',
    'codex.yangleshoCave.body':
      '[History] Yangleshö Cave is a natural rock overhang and cavern nestled beside a spring on the lower cliffs of Pharping, Nepal. In the 8th century, Padmasambhava practiced the Yangdak Heruka and Vajrakīlaya sadhanas here alongside Princess Śākyadevī, attaining the supreme realization of Mahāmudrā. Revered by the Nyingma tradition as a site equal in blessing to Bodh Gaya, its butter lamps burn to this day.',

    'codex.asuraCave.title': 'Asura Cave',
    'codex.asuraCave.body':
      '[History] Perched high on the wooded cliff above Yangleshö in Pharping, Asura Cave is an upper retreat cavern where Padmasambhava meditated in deep samādhi and subdued fierce obstacle-makers causing drought across the valley. Sacred self-arisen impressions linked to Vajrakīlaya are still venerated on the rock face, and the cave remains an active retreat sanctuary overlooking Pharping.',

    'codex.vajrakilaya.title': 'Vajrakīlaya',
    'codex.vajrakilaya.body':
      '[History] Vajrakīlaya (Tib. Dorje Phurba, "Vajra Youth") is the wrathful heruka deity of enlightened activity among the Eight Great Sadhana Teachings (Kagyé) of Nyingma Buddhism. Rooted in the Indian Vajrakīlaya Tantra, the practice embodies indestructible compassion that pierces through inner and outer obstacles. Padmasambhava established its lineage at Yangleshö to harmonize realization with obstacle-clearing.',

    'codex.phurba.title': 'Phurba (Kīla)',
    'codex.phurba.body':
      '[History] The Phurba (Sanskrit: Kīla) is a three-sided ritual dagger of Indo-Tibetan Buddhism, crowned by three wrathful faces and a vajra hilt above a makara-mounted triple blade. Its three edges symbolize severing the three root poisons—clinging, anger, and ignorance—across past, present, and future. Rather than harming beings, the Phurba pins down ego-fixation into the unchanging nature of mind.',

    'codex.droughtLegend.title': 'Legend of the Pharping Drought',
    'codex.droughtLegend.body':
      '[Legend] According to the biographies of Padmasambhava, while the Guru meditated at Yangleshö in Pharping, hostile spirits and nagas provoked a devastating three-year drought and famine across Nepal. Padmasambhava sent messengers to India to bring the Vajrakīlaya tantras; the moment the texts arrived and the mandala was revealed, the spirits were bound under oath and life-giving rain flooded the valley.',
  },
};

i18n.register(CH1_I18N);
export default CH1_I18N;
