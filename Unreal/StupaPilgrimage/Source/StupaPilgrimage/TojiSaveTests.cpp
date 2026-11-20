#include "TojiSave.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTojiWebSaveTest, "Stupa.Toji.Save.WebV2",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTojiWebSaveTest::RunTest(const FString& Parameters)
{
    FTojiProgress Progress;
    const TCHAR* Valid = TEXT(R"JSON({
        "version":2,"savedAt":1795140000000,"sections":{
          "settings":{"lang":"zh","volume":0.6},
          "japanCampaign":{"version":1,"completedSteps":["initiation","sankosho","eastwardVow","kukaiToji","yakushi"]},
          "unrecognized":{"keep":["完整保留",1,true]}
        }
    })JSON");
    TestTrue(TEXT("Accepts the web export shape"), TojiSave::ParseWeb(Valid, Progress));
    TestFalse(TEXT("Web zh maps to Traditional Chinese"), Progress.bEnglish);
    TestEqual(TEXT("Only the two completed Tō-ji objectives count"), Progress.Completed, 2);

    TestFalse(TEXT("Future root rejected"), TojiSave::ParseWeb(TEXT(R"({"version":3,"sections":{}})"), Progress));
    TestFalse(TEXT("Missing sections rejected"), TojiSave::ParseWeb(TEXT(R"({"version":2})"), Progress));
    TestFalse(TEXT("Non-object sections rejected"), TojiSave::ParseWeb(TEXT(R"({"version":2,"sections":[]})"), Progress));
    TestFalse(TEXT("String version rejected"), TojiSave::ParseWeb(TEXT(R"({"version":"2","sections":{}})"), Progress));
    TestFalse(TEXT("Malformed JSON rejected"), TojiSave::ParseWeb(TEXT(R"({"version":2)"), Progress));
    TestEqual(TEXT("Rejected import leaves the active record alone"), Progress.Completed, 2);
    TestFalse(TEXT("Rejected import leaves language alone"), Progress.bEnglish);

    const TCHAR* OutOfOrder = TEXT(R"JSON({
        "version":2,"sections":{"settings":{"lang":"en"},"japanCampaign":{"version":1,
        "completedSteps":["initiation","sankosho","eastwardVow","kukaiToji","rittaiMandala","yakushi"]}}}
    )JSON");
    TestTrue(TEXT("An out-of-order suffix does not invalidate the export"), TojiSave::ParseWeb(OutOfOrder, Progress));
    TestTrue(TEXT("English is retained"), Progress.bEnglish);
    TestEqual(TEXT("Only the consecutive campaign prefix is accepted"), Progress.Completed, 1);

    const TCHAR* FutureCampaign = TEXT(R"JSON({
        "version":2,"sections":{"japanCampaign":{"version":2,
        "completedSteps":["initiation","sankosho","eastwardVow","kukaiToji","yakushi"]}}}
    )JSON");
    TestTrue(TEXT("Future campaign versions can be archived"), TojiSave::ParseWeb(FutureCampaign, Progress));
    TestEqual(TEXT("An unknown campaign version supplies no progress"), Progress.Completed, 0);

    const TCHAR* QinglongOnly = TEXT(R"JSON({
        "version":2,"sections":{"japanCampaign":{"version":1,
        "completedSteps":["initiation","sankosho","eastwardVow"]}}}
    )JSON");
    TestTrue(TEXT("Qinglong-only backup accepted"), TojiSave::ParseWeb(QinglongOnly, Progress));
    TestEqual(TEXT("Opens at the start of Tō-ji"), Progress.Completed, 0);
    return true;
}
#endif
