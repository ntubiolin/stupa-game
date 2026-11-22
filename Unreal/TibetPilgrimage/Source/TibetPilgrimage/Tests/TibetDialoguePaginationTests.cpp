#include "../TibetGameMode.h"
#include "../TibetHUD.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "CanvasItem.h"
#include "Components/SceneComponent.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/World.h"
#include "Fonts/CompositeFont.h"
#include "Fonts/SlateFontInfo.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "Misc/AutomationTest.h"

struct FTibetDialogueTestAccessor
{
    static void Configure(ATibetGameMode& Mode, UTibetSave* Save, const FString& Map = TEXT("stupa"), const FString& Route = FString())
    {
        Mode.Save = Save;
        Mode.Map = Map;
        Mode.Route = Route.IsEmpty() ? Map : Route;
    }

    static void BeginObjectiveDialogue(ATibetGameMode& Mode, int32 ObjectiveIndex)
    {
        Mode.BeginDialogue(ObjectiveIndex);
    }

    static void BeginCustom(ATibetGameMode& Mode, const TCHAR* SpeakerEn, const TCHAR* SpeakerZh,
        const TCHAR* SpeechEn, const TCHAR* SpeechZh)
    {
        Mode.BeginCustomDialogue(SpeakerEn, SpeakerZh, SpeechEn, SpeechZh);
    }

    static const TArray<int32>& GetPageStarts(const ATibetGameMode& Mode)
    {
        return Mode.PageStarts;
    }

    static void SendWordOffset(ATibetGameMode& Mode, int32 Offset)
    {
        Mode.SetDialogueWord(Offset);
    }

    static void SetResident(ATibetGameMode& Mode, FName Id, AActor* Actor)
    {
        Mode.Residents.Add(Id, Actor);
    }

    static void SetSideGate(ATibetGameMode& Mode, AActor* Gate)
    {
        Mode.SideGate = Gate;
    }
};

namespace
{
class FTibetCanvasTextProbe : public FCanvasTextItem
{
public:
    using FCanvasTextItem::FCanvasTextItem;
    bool IsDrawable() const { return HasValidText(); }
};

AActor* SpawnAnchoredActor(UWorld& World, const FVector& Location)
{
    AActor* Actor = World.SpawnActor<AActor>();
    if (!Actor) return nullptr;
    auto* Root = NewObject<USceneComponent>(Actor);
    Actor->SetRootComponent(Root);
    Root->RegisterComponent();
    Actor->SetActorLocation(Location);
    return Actor;
}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetDialogueMultiPageStepTest, "Tibet.Dialogue.MultiPageStepAndCompletion",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetDialogueMultiPageStepTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    auto* Mode = NewObject<ATibetGameMode>();
    FTibetDialogueTestAccessor::Configure(*Mode, Save, TEXT("stupa"));

    // 1. Verify Chinese multi-page splitting & stepping 0..N-1 -> final page closes.
    Save->bEnglish = false;
    FTibetDialogueTestAccessor::BeginObjectiveDialogue(*Mode, 3); // Jarung Khashor chronicle
    const int32 ZhCount = Mode->DialoguePageCount();
    TestTrue(TEXT("Chinese Jarung Khashor speech splits into multiple pages"), ZhCount > 3);
    TestEqual(TEXT("Starts on page 0"), Mode->DialoguePageIndex(), 0);
    TestTrue(TEXT("Has next page at page 0"), Mode->HasNextDialoguePage());
    TestEqual(TEXT("Chinese speaker populated"), Mode->DialogueSpeaker(), FString(TEXT("老喇嘛・洛桑")));

    FString CombinedZh;
    for (int32 Expected = 0; Expected < ZhCount; ++Expected)
    {
        TestEqual(TEXT("DialoguePageIndex matches step"), Mode->DialoguePageIndex(), Expected);
        const FString PageText = Mode->DialoguePage();
        TestFalse(TEXT("Each Chinese dialogue page is non-empty"), PageText.IsEmpty());
        CombinedZh += PageText;
        if (Expected < ZhCount - 1)
        {
            TestTrue(TEXT("HasNextDialoguePage true before final page"), Mode->HasNextDialoguePage());
            Mode->NextDialoguePage();
            TestFalse(TEXT("Stepping to next page keeps speaker active"), Mode->DialogueSpeaker().IsEmpty());
        }
        else
        {
            TestFalse(TEXT("HasNextDialoguePage false on final page"), Mode->HasNextDialoguePage());
        }
    }
    TestTrue(TEXT("Concatenated Chinese pages preserve full chronicle"),
        CombinedZh.Contains(TEXT("夏瓦日")) && CombinedZh.Contains(TEXT("赤松德贊")) && CombinedZh.Contains(TEXT("蓮花生大士")));

    // Clicking Done ("完成") on the final page closes and clears dialogue.
    Mode->NextDialoguePage();
    TestTrue(TEXT("NextDialoguePage on final page clears speaker"), Mode->DialogueSpeaker().IsEmpty());
    TestTrue(TEXT("NextDialoguePage on final page clears page text"), Mode->DialoguePage().IsEmpty());
    TestEqual(TEXT("NextDialoguePage on final page resets page count"), Mode->DialoguePageCount(), 0);
    TestEqual(TEXT("NextDialoguePage on final page resets page index"), Mode->DialoguePageIndex(), 0);
    TestFalse(TEXT("HasNextDialoguePage false when closed"), Mode->HasNextDialoguePage());

    // 2. Verify English word-wrapped multi-page splitting & stepping 0..N-1 -> final page closes.
    Save->bEnglish = true;
    FTibetDialogueTestAccessor::BeginObjectiveDialogue(*Mode, 0);
    const int32 EnCount = Mode->DialoguePageCount();
    TestTrue(TEXT("English greeting splits into multiple pages"), EnCount > 1);
    TestEqual(TEXT("English speaker populated"), Mode->DialogueSpeaker(), FString(TEXT("Old Lama Lobsang")));

    FString CombinedEn;
    for (int32 Expected = 0; Expected < EnCount; ++Expected)
    {
        TestEqual(TEXT("English page index matches step"), Mode->DialoguePageIndex(), Expected);
        const FString PageText = Mode->DialoguePage();
        TestFalse(TEXT("Each English page is non-empty"), PageText.IsEmpty());
        CombinedEn += TEXT(" ") + PageText;
        TestEqual(TEXT("English HasNextDialoguePage tracks remaining pages"),
            Mode->HasNextDialoguePage(), Expected < EnCount - 1);
        Mode->NextDialoguePage();
    }
    TestTrue(TEXT("Concatenated English pages preserve greeting"),
        CombinedEn.Contains(TEXT("Tashi Delek")) && CombinedEn.Contains(TEXT("Jarung Khashor")));
    TestTrue(TEXT("Final English NextDialoguePage closes dialogue"), Mode->DialogueSpeaker().IsEmpty());
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetDialogueSkipAndVoiceSyncTest, "Tibet.Dialogue.SkipImmediateCompletionAndVoiceOffset",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetDialogueSkipAndVoiceSyncTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    auto* Mode = NewObject<ATibetGameMode>();
    FTibetDialogueTestAccessor::Configure(*Mode, Save, TEXT("stupa"));

    // 1. Direct Skip ("略過") from page 0 immediately completes and closes multi-page dialogue.
    Save->bEnglish = false;
    Mode->SpeakSkyGuruBlessing();
    TestTrue(TEXT("Sky Guru blessing has multiple pages"), Mode->DialoguePageCount() > 2);
    TestEqual(TEXT("Starts at page 0 before skip"), Mode->DialoguePageIndex(), 0);
    TestTrue(TEXT("HasNextDialoguePage true before skip"), Mode->HasNextDialoguePage());

    Mode->StopDialogue();
    TestTrue(TEXT("StopDialogue from page 0 clears speaker immediately"), Mode->DialogueSpeaker().IsEmpty());
    TestTrue(TEXT("StopDialogue from page 0 clears page text immediately"), Mode->DialoguePage().IsEmpty());
    TestEqual(TEXT("StopDialogue resets page count to 0"), Mode->DialoguePageCount(), 0);
    TestEqual(TEXT("StopDialogue resets page index to 0"), Mode->DialoguePageIndex(), 0);
    TestFalse(TEXT("StopDialogue clears HasNextDialoguePage"), Mode->HasNextDialoguePage());

    // 2. Relative word offset synchronization after NextDialoguePage().
    Mode->SpeakSkyGuruBlessing();
    const TArray<int32> Starts = FTibetDialogueTestAccessor::GetPageStarts(*Mode);
    if (!TestTrue(TEXT("At least 3 pages for word-offset check"), Starts.Num() >= 3)) return false;

    Mode->NextDialoguePage();
    TestEqual(TEXT("Advanced manually to page 1"), Mode->DialoguePageIndex(), 1);

    // Restarted utterance speaks from &Dialogue[Starts[1]], reporting BaseOffset + 0 on first word.
    FTibetDialogueTestAccessor::SendWordOffset(*Mode, Starts[1]);
    TestEqual(TEXT("First word of restarted page 1 stays on page 1"), Mode->DialoguePageIndex(), 1);

    // Advancing speech past Starts[2] steps naturally to page 2.
    FTibetDialogueTestAccessor::SendWordOffset(*Mode, Starts[2]);
    TestEqual(TEXT("Word reaching page 2 boundary advances to page 2"), Mode->DialoguePageIndex(), 2);

    Mode->StopDialogue();
    TestTrue(TEXT("Skip from middle page clears dialogue"), Mode->DialogueSpeaker().IsEmpty());
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetInteractionPromptAndCanvasFontTest, "Tibet.Dialogue.InteractionPromptAndCanvasFont",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetInteractionPromptAndCanvasFontTest::RunTest(const FString&)
{
    // 1. Verify ATibetHUD runtime CanvasFont makes FCanvasTextItem(FSlateFontInfo) valid for drawing.
    auto* HUD = NewObject<ATibetHUD>();
    const UFont* RuntimeFont = HUD->EnsureCanvasFont();
    if (!TestNotNull(TEXT("EnsureCanvasFont creates non-null UFont"), RuntimeFont)) return false;
    TestEqual(TEXT("CanvasFont uses Runtime font cache for CJK + Latin Slate fonts"),
        RuntimeFont->FontCacheType, EFontCacheType::Runtime);

    FSlateFontInfo SlateFont(MakeShared<FStandaloneCompositeFont>(), 16);
    FTibetCanvasTextProbe BrokenItem(FVector2D::ZeroVector, FText::FromString(TEXT("[E] 與洛桑交談")), SlateFont, FLinearColor::White);
    TestFalse(TEXT("Unpatched FCanvasTextItem(FSlateFontInfo) has null Font and skips drawing"), BrokenItem.IsDrawable());

    BrokenItem.Font = RuntimeFont;
    TestTrue(TEXT("Assigning Runtime CanvasFont enables FCanvasTextItem drawing while keeping SlateFontInfo"),
        BrokenItem.IsDrawable() && BrokenItem.SlateFontInfo.IsSet());

    // 2. Verify fallback GetInteractionPrompt without an active world target.
    auto* Save = NewObject<UTibetSave>();
    auto* StandaloneMode = NewObject<ATibetGameMode>();
    FTibetDialogueTestAccessor::Configure(*StandaloneMode, Save, TEXT("stupa"));
    Save->bEnglish = false;
    TestEqual(TEXT("Fallback desktop prompt is [E]"), StandaloneMode->GetInteractionPrompt(false), FString(TEXT("[E]")));
    TestEqual(TEXT("Fallback Chinese touch prompt is 點選互動"), StandaloneMode->GetInteractionPrompt(true), FString(TEXT("點選互動")));
    Save->bEnglish = true;
    TestEqual(TEXT("Fallback English touch prompt is Tap Act"), StandaloneMode->GetInteractionPrompt(true), FString(TEXT("Tap Act")));

    // 3. Verify descriptive bilingual interaction prompts in a transient world near Lobsang and Grove Gate.
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false);
    if (!TestNotNull(TEXT("Created transient test world"), World)) return false;
    FWorldContext& WorldContext = GEngine->CreateNewWorldContext(EWorldType::Game);
    WorldContext.SetCurrentWorld(World);
    World->InitializeActorsForPlay(FURL());

    auto* Mode = World->SpawnActor<ATibetGameMode>();
    auto* PC = World->SpawnActor<APlayerController>();
    auto* Pawn = World->SpawnActor<APawn>();
    if (Pawn)
    {
        auto* PawnRoot = NewObject<USceneComponent>(Pawn);
        Pawn->SetRootComponent(PawnRoot);
        PawnRoot->RegisterComponent();
    }
    AActor* Lobsang = SpawnAnchoredActor(*World, FVector(-1320, 230, 0));
    AActor* SideGate = SpawnAnchoredActor(*World, FVector(-1860, -480, 0));

    if (TestTrue(TEXT("Spawned transient actors"), Mode && PC && Pawn && Lobsang && SideGate))
    {
        PC->SetPawn(Pawn);
        FTibetDialogueTestAccessor::Configure(*Mode, Save, TEXT("stupa"));
        FTibetDialogueTestAccessor::SetResident(*Mode, TEXT("oldLama"), Lobsang);
        FTibetDialogueTestAccessor::SetSideGate(*Mode, SideGate);

        Pawn->SetActorLocation(FVector(-1440, 230, 0));
        Save->bEnglish = false;
        TestEqual(TEXT("Chinese desktop NPC prompt"), Mode->GetInteractionPrompt(false), FString(TEXT("[E] 與洛桑交談")));
        TestEqual(TEXT("Chinese touch NPC prompt"), Mode->GetInteractionPrompt(true), FString(TEXT("點選互動 · 與洛桑交談")));

        Save->bEnglish = true;
        TestEqual(TEXT("English desktop NPC prompt"), Mode->GetInteractionPrompt(false), FString(TEXT("[E] Talk to Lobsang")));
        TestEqual(TEXT("English touch NPC prompt"), Mode->GetInteractionPrompt(true), FString(TEXT("Tap Act · Talk to Lobsang")));

        Pawn->SetActorLocation(FVector(-1980, -480, 0));
        Save->bEnglish = false;
        TestEqual(TEXT("Chinese desktop Grove gate prompt"), Mode->GetInteractionPrompt(false), FString(TEXT("[E] 前往行者塔林")));
        Save->bEnglish = true;
        TestEqual(TEXT("English desktop Grove gate prompt"), Mode->GetInteractionPrompt(false), FString(TEXT("[E] Visit the votive grove")));
    }

    GEngine->DestroyWorldContext(World);
    World->DestroyWorld(false);
    return true;
}
#endif
