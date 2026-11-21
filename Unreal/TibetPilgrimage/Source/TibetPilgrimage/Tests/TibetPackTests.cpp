#include "../TibetGameMode.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Kismet/GameplayStatics.h"
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetLegacyPackTest, "Tibet.Journal.PrePackSave",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetLegacyPackTest::RunTest(const FString&)
{
    // The #356 camera journey talked to Lobsang and saved before pack fields existed.
    TArray<uint8> Data;
    if (!TestTrue(TEXT("Read authentic pre-pack checkpoint"), FFileHelper::LoadFileToArray(Data,
        *(FPaths::ProjectDir()/TEXT("QA/Fixtures/pre-pack-v1.sav"))))) return false;
    const auto* Save = Cast<UTibetSave>(UGameplayStatics::LoadGameFromMemory(Data));
    if (!TestNotNull(TEXT("Deserialize previous same-slot format"), Save)) return false;
    TestEqual(TEXT("Old route"), Save->Map, FString(TEXT("stupa")));
    TestEqual(TEXT("Old objective remains after first dialogue"), Save->Steps.FindRef(TEXT("stupa")), 1);
    TestEqual(TEXT("Starting pouch"), Save->PillCharges, 4);
    TestEqual(TEXT("No unsolicited equipment"), Save->Equipment, 0);
    TestFalse(TEXT("Quick item defaults to amrita"), Save->bQuickMap);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetLampQuestTest, "Tibet.Courtyard.DistinctLamps",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetLampQuestTest::RunTest(const FString&)
{
    const FString Stupa=TEXT("stupa");
    constexpr int32 LampStep=2;
    auto* Save=NewObject<UTibetSave>();
    Save->ReconcileLampQuest();
    Save->ButterLampMask=0b111000; // all three entrance table bowls
    Save->Steps.Add(Stupa,LampStep);
    TestFalse(TEXT("Table offerings do not advance the quest"),Save->ReconcileLampQuest());
    Save->ButterLampMask|=4; // third quest bowl offered
    Save->ReconcileLampQuest();
    TestEqual(TEXT("Pre-quest offering counts"),Save->Counts.FindRef(Stupa),1);
    TestEqual(TEXT("Guide points to an unlit bowl"),Save->NextUnlitLamp(),0);
    TestFalse(TEXT("Refilling the same wick earns no extra progress"),Save->ReconcileLampQuest());
    Save->ButterLampMask|=2;
    Save->ReconcileLampQuest();
    TestEqual(TEXT("Two distinct bowls"),Save->Counts.FindRef(Stupa),2);
    TestEqual(TEXT("Out-of-order offerings do not light the first bowl"),int32(Save->ButterLampMask),0b111110);
    Save->ButterLampMask|=1;
    Save->ReconcileLampQuest();
    TestEqual(TEXT("Three reverse-order offerings complete the quest"),Save->Steps.FindRef(Stupa),LampStep+1);
    TestEqual(TEXT("Next objective starts at zero"),Save->Counts.FindRef(Stupa),0);
    auto* Legacy=NewObject<UTibetSave>();
    Legacy->Steps.Add(Stupa,LampStep);
    Legacy->Counts.Add(Stupa,1);
    Legacy->ButterLampMask=4;
    Legacy->ReconcileLampQuest();
    TestEqual(TEXT("Legacy ordered progress and later free lamp survive"),int32(Legacy->ButterLampMask),5);
    TestEqual(TEXT("Old slot has one unlit lamp"),Legacy->NextUnlitLamp(),1);
    Legacy->ReconcileLampQuest();
    TestEqual(TEXT("Reloading the migrated count does not manufacture a second wick"),int32(Legacy->ButterLampMask),5);
    return true;
}
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetTravelDetourTest, "Tibet.Journal.FastTravelDetours",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetTravelDetourTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    Save->Steps.Add(TEXT("terma3"), 2);
    Save->ResolveReturnOnArrival(TEXT("chimphu"));
    TestFalse(TEXT("An unfinished vault does not start the return"), Save->bReturnFromTerma);
    Save->Steps.Add(TEXT("terma3"), 3);
    Save->ResolveReturnOnArrival(TEXT("grove"));
    Save->ResolveReturnOnArrival(TEXT("chimphu"));
    TestTrue(TEXT("Returning after visiting the grove still unlocks Yeshe's report"), Save->bReturnFromTerma);
    Save->ResolveReturnOnArrival(TEXT("stupa"));
    TestFalse(TEXT("The epilogue requires Yeshe's report"), Save->bEpilogue);
    Save->Steps.Add(TEXT("return"), 1);
    Save->ResolveReturnOnArrival(TEXT("samye"));
    Save->ResolveReturnOnArrival(TEXT("stupa"));
    TestTrue(TEXT("Returning via Samye still unlocks the epilogue"), Save->bEpilogue);
    return true;
}
#endif
