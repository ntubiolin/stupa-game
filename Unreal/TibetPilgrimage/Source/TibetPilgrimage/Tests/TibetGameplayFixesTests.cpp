#include "../TibetGameMode.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Kismet/GameplayStatics.h"
#include "Misc/AutomationTest.h"

struct FTibetGameplayTestAccessor
{
    static void Configure(ATibetGameMode& Mode, UTibetSave* Save, float Mana,
        const FString& Map = FString(), const FString& Route = FString(), const FString& Slot = FString())
    {
        Mode.Save = Save;
        Mode.Mana = Mana;
        Mode.Map = Map;
        Mode.Route = Route.IsEmpty() ? Map : Route;
        if (!Slot.IsEmpty()) Mode.SlotName = Slot;
    }

    static UTibetSave* GetSave(const ATibetGameMode& Mode)
    {
        return Mode.Save;
    }

    static FString EnemyLabel(const ATibetGameMode& Mode)
    {
        return Mode.EnemyLabel();
    }
};

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetFeedingBellMaxManaTest, "Tibet.Gameplay.FeedingBellMaxMana",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetFeedingBellMaxManaTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    Save->Steps.Add(TEXT("wild"), 1);
    Save->Equipment = 1 << int32(ETibetItem::Bell);

    auto* Mode = NewObject<ATibetGameMode>();
    FTibetGameplayTestAccessor::Configure(*Mode, Save, 108.f, TEXT("stupa"));

    TestEqual(TEXT("Bronze Bell raises max mana to 110"), Mode->MaxMana(), 110.f);

    Mode->RestoreMana(ATibetGameMode::FeedingManaReward);
    TestEqual(TEXT("Feeding above 100 mana clamps to 110 instead of dropping to 100"), Mode->GetMana(), 110.f);

    FTibetGameplayTestAccessor::Configure(*Mode, Save, 95.f, TEXT("stupa"));
    Mode->RestoreMana(ATibetGameMode::FeedingManaReward);
    TestEqual(TEXT("Feeding restores +10 mana past 100 when Bronze Bell is equipped"), Mode->GetMana(), 105.f);

    Save->Equipment = 0;
    FTibetGameplayTestAccessor::Configure(*Mode, Save, 95.f, TEXT("stupa"));
    TestEqual(TEXT("Without Bronze Bell max mana returns to 100"), Mode->MaxMana(), 100.f);
    Mode->RestoreMana(ATibetGameMode::FeedingManaReward);
    TestEqual(TEXT("Without Bronze Bell feeding clamps to 100"), Mode->GetMana(), 100.f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetHumBoltManaRestoreTest, "Tibet.Gameplay.HumBoltManaRestore",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetHumBoltManaRestoreTest::RunTest(const FString&)
{
    TestEqual(TEXT("Pure clamp adds +2 below cap"),
        ATibetGameMode::ClampRestoredMana(50.f, ATibetGameMode::HumBoltManaRestore, 100.f), 52.f);
    TestEqual(TEXT("Pure clamp caps at 100"),
        ATibetGameMode::ClampRestoredMana(99.f, ATibetGameMode::HumBoltManaRestore, 100.f), 100.f);
    TestEqual(TEXT("Pure clamp caps at 110 with Bronze Bell"),
        ATibetGameMode::ClampRestoredMana(109.f, ATibetGameMode::HumBoltManaRestore, 110.f), 110.f);

    auto* Save = NewObject<UTibetSave>();
    Save->Steps.Add(TEXT("wild"), 1);

    auto* Mode = NewObject<ATibetGameMode>();
    FTibetGameplayTestAccessor::Configure(*Mode, Save, 99.f, TEXT("wild"));
    Mode->RestoreMana(ATibetGameMode::HumBoltManaRestore);
    TestEqual(TEXT("Hum Bolt hit clamps at 100 without Bronze Bell"), Mode->GetMana(), 100.f);

    Save->Equipment = 1 << int32(ETibetItem::Bell);
    FTibetGameplayTestAccessor::Configure(*Mode, Save, 100.f, TEXT("wild"));
    Mode->RestoreMana(ATibetGameMode::HumBoltManaRestore);
    TestEqual(TEXT("Hum Bolt hit restores +2 past 100 with Bronze Bell"), Mode->GetMana(), 102.f);

    FTibetGameplayTestAccessor::Configure(*Mode, Save, 109.f, TEXT("wild"));
    Mode->RestoreMana(ATibetGameMode::HumBoltManaRestore);
    TestEqual(TEXT("Hum Bolt hit clamps to 110 with Bronze Bell"), Mode->GetMana(), 110.f);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetChapterCombatMeshesTest, "Tibet.Gameplay.ChapterCombatMeshes",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetChapterCombatMeshesTest::RunTest(const FString&)
{
    // Samye non-boss waves cycle Preta / TsenRider / DroughtSpirit by (Step + Progress) % 3.
    TSet<FString> SamyeNightModels;
    for (int32 Progress = 0; Progress < 3; ++Progress)
        SamyeNightModels.Add(ATibetGameMode::CombatFigureModel(TEXT("samye"), false, 2, Progress));
    TestEqual(TEXT("Samye night defense cycles all three distinct spirit figures"), SamyeNightModels.Num(), 3);
    TestTrue(TEXT("Samye night defense includes Preta"), SamyeNightModels.Contains(TEXT("Preta")));
    TestTrue(TEXT("Samye night defense includes TsenRider"), SamyeNightModels.Contains(TEXT("TsenRider")));
    TestTrue(TEXT("Samye night defense includes DroughtSpirit"), SamyeNightModels.Contains(TEXT("DroughtSpirit")));

    TestEqual(TEXT("Samye Hepo Ri wave 0"), ATibetGameMode::CombatFigureModel(TEXT("samye"), false, 4, 0), FString(TEXT("TsenRider")));
    TestEqual(TEXT("Samye Hepo Ri wave 1"), ATibetGameMode::CombatFigureModel(TEXT("samye"), false, 4, 1), FString(TEXT("DroughtSpirit")));
    TestEqual(TEXT("Samye Hepo Ri wave 2"), ATibetGameMode::CombatFigureModel(TEXT("samye"), false, 4, 2), FString(TEXT("Preta")));
    TestEqual(TEXT("Samye Boss stays Pehar"), ATibetGameMode::CombatFigureModel(TEXT("samye"), true, 5, 0), FString(TEXT("Pehar")));

    // Terma chambers use distinct non-boss figures instead of falling through to Guardian.
    TestEqual(TEXT("Terma 1 sentinel 0"), ATibetGameMode::CombatFigureModel(TEXT("terma1"), false, 1, 0), FString(TEXT("DroughtSpirit")));
    TestEqual(TEXT("Terma 1 sentinel 1"), ATibetGameMode::CombatFigureModel(TEXT("terma1"), false, 1, 1), FString(TEXT("Preta")));
    TestEqual(TEXT("Terma 2 crystal spirit 0"), ATibetGameMode::CombatFigureModel(TEXT("terma2"), false, 1, 0), FString(TEXT("Preta")));
    TestEqual(TEXT("Terma 2 crystal spirit 1"), ATibetGameMode::CombatFigureModel(TEXT("terma2"), false, 1, 1), FString(TEXT("SnowMigoi")));
    TestEqual(TEXT("Terma 3 Boss stays Guardian"), ATibetGameMode::CombatFigureModel(TEXT("terma3"), true, 1, 0), FString(TEXT("Guardian")));

    // Other chapters keep their dedicated figures.
    TestEqual(TEXT("Wild Boss stays SnowKing"), ATibetGameMode::CombatFigureModel(TEXT("wild"), true, 2, 0), FString(TEXT("SnowKing")));
    TestEqual(TEXT("Mangyul Boss stays Tenma"), ATibetGameMode::CombatFigureModel(TEXT("mangyul"), true, 3, 0), FString(TEXT("Tenma")));
    TestEqual(TEXT("Mangyul Combat avoids SnowKing fallback"), ATibetGameMode::CombatFigureModel(TEXT("mangyul"), false, 1, 0), FString(TEXT("SnowMigoi")));
    TestEqual(TEXT("Pharping Combat stays DroughtSpirit"), ATibetGameMode::CombatFigureModel(TEXT("pharping"), false, 1, 0), FString(TEXT("DroughtSpirit")));
    TestEqual(TEXT("Pharping Boss stays DroughtSpirit"), ATibetGameMode::CombatFigureModel(TEXT("pharping"), true, 11, 0), FString(TEXT("DroughtSpirit")));
    TestEqual(TEXT("Yarlung Combat stays RiverYak"), ATibetGameMode::CombatFigureModel(TEXT("yarlung"), false, 4, 0), FString(TEXT("RiverYak")));
    TestEqual(TEXT("Yarlung Boss stays RiverYak"), ATibetGameMode::CombatFigureModel(TEXT("yarlung"), true, 7, 0), FString(TEXT("RiverYak")));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetChapterEnemyLabelsTest, "Tibet.Gameplay.ChapterEnemyLabels",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetChapterEnemyLabelsTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    auto* Mode = NewObject<ATibetGameMode>();

    auto Check = [&](const TCHAR* Map, int32 Step, const TCHAR* ExpectedEn, const TCHAR* ExpectedZh)
    {
        Save->Steps.Add(Map, Step);
        Save->bEnglish = true;
        FTibetGameplayTestAccessor::Configure(*Mode, Save, 100.f, Map);
        TestEqual(FString::Printf(TEXT("%s step %d English label"), Map, Step),
            FTibetGameplayTestAccessor::EnemyLabel(*Mode), FString(ExpectedEn));
        Save->bEnglish = false;
        TestEqual(FString::Printf(TEXT("%s step %d Chinese label"), Map, Step),
            FTibetGameplayTestAccessor::EnemyLabel(*Mode), FString(ExpectedZh));
    };

    Check(TEXT("wild"), 2, TEXT("Migoi King"), TEXT("雪人王"));
    Check(TEXT("pharping"), 1, TEXT("Drought Sprite"), TEXT("旱魅"));
    Check(TEXT("pharping"), 11, TEXT("Drought Lord"), TEXT("旱障魔主"));
    Check(TEXT("mangyul"), 3, TEXT("Twelve Tenma"), TEXT("十二丹瑪"));
    Check(TEXT("yarlung"), 4, TEXT("Wild Yak"), TEXT("野犛牛"));
    Check(TEXT("yarlung"), 7, TEXT("Yarlha Shampo"), TEXT("雅拉香波白犛牛"));
    Check(TEXT("samye"), 2, TEXT("Night Spirit"), TEXT("夜襲鬼神"));
    Check(TEXT("samye"), 4, TEXT("Hepo Ri Spirit"), TEXT("八部鬼神"));
    Check(TEXT("samye"), 5, TEXT("Pehar Gyalpo"), TEXT("白哈爾王"));
    Check(TEXT("terma1"), 1, TEXT("Cave Sentinel"), TEXT("岩窟守衛"));
    Check(TEXT("terma2"), 1, TEXT("Crystal Spirit"), TEXT("水晶精靈"));
    Check(TEXT("terma3"), 1, TEXT("Terma Guardian"), TEXT("伏藏守護者"));
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetResetProgressTest, "Tibet.Gameplay.ResetProgress",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetResetProgressTest::RunTest(const FString&)
{
    const FString Slot = TEXT("TibetPilgrimage-UnitTest-ResetProgress");
    UGameplayStatics::DeleteGameInSlot(Slot, 0);

    auto* Save = NewObject<UTibetSave>();
    Save->Map = TEXT("wild");
    Save->bComplete = true;
    Save->bEpilogue = true;
    Save->bReturnFromTerma = true;
    Save->bEnglish = true;
    Save->Steps.Add(TEXT("stupa"), 5);
    Save->Steps.Add(TEXT("wild"), 3);
    Save->Equipment = (1 << int32(ETibetItem::Vajra)) | (1 << int32(ETibetItem::Bell));
    Save->PillCharges = 1;
    Save->ButterLampMask = 7;
    Save->MonkeysFed = 9;
    UGameplayStatics::SaveGameToSlot(Save, Slot, 0);

    auto* Mode = NewObject<ATibetGameMode>();
    FTibetGameplayTestAccessor::Configure(*Mode, Save, 42.f, TEXT("wild"), TEXT("wild"), Slot);

    TestTrue(TEXT("ResetProgress succeeds and writes fresh save"), Mode->ResetProgress());
    UTibetSave* Reset = FTibetGameplayTestAccessor::GetSave(*Mode);
    TestNotNull(TEXT("In-memory save recreated"), Reset);
    if (Reset)
    {
        TestEqual(TEXT("Reset restores starting map stupa"), Reset->Map, FString(TEXT("stupa")));
        TestTrue(TEXT("Reset preserves language preference"), Reset->bEnglish);
        TestFalse(TEXT("Reset clears campaign complete"), Reset->bComplete);
        TestFalse(TEXT("Reset clears epilogue"), Reset->bEpilogue);
        TestFalse(TEXT("Reset clears terma return"), Reset->bReturnFromTerma);
        TestEqual(TEXT("Reset clears steps"), Reset->Steps.Num(), 0);
        TestEqual(TEXT("Reset clears equipment"), Reset->Equipment, 0);
        TestEqual(TEXT("Reset restores 4 Amrita pills"), Reset->PillCharges, 4);
        TestEqual(TEXT("Reset clears butter lamps"), int32(Reset->ButterLampMask), 0);
        TestEqual(TEXT("Reset clears monkeys fed"), Reset->MonkeysFed, 0);
    }

    auto* Disk = Cast<UTibetSave>(UGameplayStatics::LoadGameFromSlot(Slot, 0));
    TestNotNull(TEXT("Disk save slot updated"), Disk);
    if (Disk)
    {
        TestEqual(TEXT("Disk save map is stupa"), Disk->Map, FString(TEXT("stupa")));
        TestFalse(TEXT("Disk save bComplete cleared"), Disk->bComplete);
        TestEqual(TEXT("Disk save steps empty"), Disk->Steps.Num(), 0);
        TestEqual(TEXT("Disk save pills restored to 4"), Disk->PillCharges, 4);
        TestTrue(TEXT("Disk save preserves language"), Disk->bEnglish);
    }

    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    return true;
}
#endif
