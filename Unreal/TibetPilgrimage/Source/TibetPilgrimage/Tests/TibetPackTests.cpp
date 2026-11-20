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
#endif
