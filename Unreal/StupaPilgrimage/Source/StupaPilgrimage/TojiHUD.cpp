#include "TojiHUD.h"

#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "Fonts/CompositeFont.h"
#include "Fonts/SlateFontInfo.h"
#include "HAL/FileManager.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Styling/CoreStyle.h"
#include "TojiGameMode.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
TSharedPtr<const FCompositeFont> TraditionalChineseTypeface()
{
#if PLATFORM_MAC
    const TCHAR* Songti = TEXT("/System/Library/Fonts/Supplemental/Songti.ttc");
    if (IFileManager::Get().FileExists(Songti))
    {
        auto Font = MakeShared<FStandaloneCompositeFont>(TEXT("Regular"), FString(Songti),
            EFontHinting::Default, EFontLoadingPolicy::LazyLoad);
        // The macOS Songti collection stores STSongti-TC-Regular at face index 7.
        Font->DefaultTypeface.Fonts[0].Font.SetSubFaceIndex(7);
        return Font;
    }
#endif
    return FCoreStyle::GetDefaultFont();
}
}

void ATojiHUD::BeginPlay()
{
    Super::BeginPlay();
    FString PhotoDirectory;
    if (FParse::Value(FCommandLine::Get(), TEXT("-TojiPhotoDir="), PhotoDirectory) && !PhotoDirectory.IsEmpty())
    {
        return;
    }
    UGameViewportClient* Viewport = GetWorld()->GetGameViewport();
    ATojiGameMode* Mode = GetWorld()->GetAuthGameMode<ATojiGameMode>();
    if (!Viewport || !Mode)
    {
        return;
    }
    const FLinearColor Paper(0.91f, 0.85f, 0.72f);
    const FLinearColor Amber(0.96f, 0.68f, 0.31f);
    const FLinearColor Panel(0.035f, 0.043f, 0.053f, 0.88f);
    const FSlateBrush* White = FCoreStyle::Get().GetBrush(TEXT("WhiteBrush"));
    const auto Font = [Game = TWeakObjectPtr<ATojiGameMode>(Mode),
        ChineseTypeface = TraditionalChineseTypeface()](int32 Size, const TCHAR* Face)
    {
        const FSlateFontInfo Latin = FCoreStyle::GetDefaultFontStyle(FName(Face), Size);
        const FSlateFontInfo Chinese(ChineseTypeface, Size, TEXT("Regular"), FFontOutlineSettings());
        return TAttribute<FSlateFontInfo>::CreateLambda([Game, Latin, Chinese]()
        {
            return Game.IsValid() && !Game->IsEnglish() ? Chinese : Latin;
        });
    };

    Overlay = SNew(SOverlay)
        .Visibility(EVisibility::HitTestInvisible)
        + SOverlay::Slot()
        .HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(26, 26)
        [
            SNew(SBorder)
            .BorderImage(White).BorderBackgroundColor(Panel).Padding(FMargin(18, 14))
            [
                SNew(SVerticalBox)
                + SVerticalBox::Slot().AutoHeight()
                [
                    SNew(STextBlock).Font(Font(32, TEXT("Bold"))).ColorAndOpacity(Paper)
                    .Text_Lambda([Mode]() { return Mode->Text(TEXT("Kyoto Tō-ji"), TEXT("京都東寺")); })
                ]
                + SVerticalBox::Slot().AutoHeight().Padding(0, 2, 0, 9)
                [
                    SNew(STextBlock).Font(Font(15, TEXT("Regular"))).ColorAndOpacity(Amber)
                    .Text_Lambda([Mode]() { return Mode->Text(TEXT("Kūkai’s Pilgrimage"), TEXT("空海朝聖之路")); })
                ]
                + SVerticalBox::Slot().AutoHeight()
                [
                    SNew(STextBlock).Font(Font(16, TEXT("Regular"))).ColorAndOpacity(Paper)
                    .WrapTextAt(430)
                    .Text_Lambda([Mode]() { return Mode->ObjectiveText(); })
                ]
            ]
        ]
        + SOverlay::Slot()
        .HAlign(HAlign_Right).VAlign(VAlign_Top).Padding(26, 26)
        [
            SNew(SBorder).BorderImage(White).BorderBackgroundColor(Panel).Padding(FMargin(13, 9))
            [
                SNew(STextBlock).Font(Font(15, TEXT("Regular"))).ColorAndOpacity(Amber)
                .Text_Lambda([Mode]() { return Mode->TimeText(); })
            ]
        ]
        + SOverlay::Slot()
        .HAlign(HAlign_Center).VAlign(VAlign_Bottom).Padding(0, 0, 0, 85)
        [
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight().HAlign(HAlign_Center).Padding(0, 0, 0, 10)
            [
                SNew(SBorder).BorderImage(White).BorderBackgroundColor(Panel).Padding(FMargin(17, 12))
                .Visibility_Lambda([Mode]() { return Mode->NoticeText().IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible; })
                [
                    SNew(STextBlock).Font(Font(18, TEXT("Regular"))).ColorAndOpacity(Paper).WrapTextAt(580)
                    .Text_Lambda([Mode]() { return Mode->NoticeText(); })
                ]
            ]
            + SVerticalBox::Slot().AutoHeight().HAlign(HAlign_Center)
            [
                SNew(SBorder).BorderImage(White).BorderBackgroundColor(Panel).Padding(FMargin(15, 10))
                .Visibility_Lambda([Mode]() { return Mode->PromptText().IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible; })
                [
                    SNew(STextBlock).Font(Font(18, TEXT("Bold"))).ColorAndOpacity(Amber)
                    .Text_Lambda([Mode]() { return Mode->PromptText(); })
                ]
            ]
        ]
        + SOverlay::Slot()
        .HAlign(HAlign_Fill).VAlign(VAlign_Bottom)
        [
            SNew(SBorder).BorderImage(White).BorderBackgroundColor(Panel).Padding(FMargin(26, 10))
            [
                SNew(STextBlock).Font(Font(14, TEXT("Regular"))).ColorAndOpacity(Paper)
                .AutoWrapText(true)
                .Text_Lambda([Mode]()
                {
                    return Mode->Text(
                        TEXT("WASD Move    Mouse Look    Space Jump    E Interact    Q Purify    L Language    "
                            "1 2 3 Lighting    I Open save folder    F9 Import"),
                        TEXT("WASD 移動    滑鼠 視角    空白鍵 跳躍    E 互動    Q 淨化    L 語言    "
                            "1 2 3 時段    I 開啟存檔資料夾    F9 匯入"));
                })
            ]
        ];
    Viewport->AddViewportWidgetContent(Overlay.ToSharedRef());
}

void ATojiHUD::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (Overlay)
    {
        if (UGameViewportClient* Viewport = GetWorld()->GetGameViewport())
        {
            Viewport->RemoveViewportWidgetContent(Overlay.ToSharedRef());
        }
        Overlay.Reset();
    }
    Super::EndPlay(EndPlayReason);
}
