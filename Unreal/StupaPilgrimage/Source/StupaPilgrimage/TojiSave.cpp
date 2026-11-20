#include "TojiSave.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformProcess.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Guid.h"
#include "Misc/Paths.h"
#include "Misc/Parse.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

#if PLATFORM_MAC
#include <cstdio>
#endif

const TCHAR* const TojiSave::OrderedSteps[] = {
    TEXT("initiation"), TEXT("sankosho"), TEXT("eastwardVow"),
    TEXT("kukaiToji"), TEXT("yakushi"), TEXT("rittaiMandala"),
    TEXT("wardEarth"), TEXT("wardFire"), TEXT("wardWind")
};

namespace
{
constexpr int64 MaxBackupBytes = 8 * 1024 * 1024;
constexpr int64 MaxLocalBytes = 16 * 1024;

bool ReadObject(const FString& Document, TSharedPtr<FJsonObject>& Root)
{
    return FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Document), Root) && Root.IsValid();
}

bool HasVersion(const FJsonObject& Object, double Expected)
{
    const TSharedPtr<FJsonValue> Version = Object.TryGetField(TEXT("version"));
    return Version.IsValid() && Version->Type == EJson::Number && Version->AsNumber() == Expected;
}

bool WriteAtomic(const FString& FilePath, TFunctionRef<bool(const FString&)> WriteFile)
{
    IFileManager& Files = IFileManager::Get();
    if (!Files.MakeDirectory(*FPaths::GetPath(FilePath), true))
    {
        return false;
    }
    const FString Temporary = FilePath + TEXT(".") + FGuid::NewGuid().ToString(EGuidFormats::Digits) + TEXT(".tmp");
    if (!WriteFile(Temporary))
    {
        Files.Delete(*Temporary);
        return false;
    }
#if PLATFORM_MAC
    // A same-directory rename replaces the previous snapshot atomically on macOS.
    const bool bMoved = std::rename(TCHAR_TO_UTF8(*Temporary), TCHAR_TO_UTF8(*FilePath)) == 0;
#else
    const bool bMoved = Files.Move(*FilePath, *Temporary, true, false, false, true);
#endif
    if (!bMoved)
    {
        Files.Delete(*Temporary);
    }
    return bMoved;
}

bool IsBackupName(const FString& Name)
{
    if (Name.IsEmpty())
    {
        return true;
    }
    FGuid Id;
    return FGuid::ParseExact(FPaths::GetBaseFilename(Name), EGuidFormats::Digits, Id)
        && Name == Id.ToString(EGuidFormats::Digits) + TEXT(".json");
}
}

FString TojiSave::Directory()
{
    FString Override;
    if (FParse::Value(FCommandLine::Get(), TEXT("-TojiSaveDir="), Override) && !Override.IsEmpty())
    {
        return FPaths::ConvertRelativePathToFull(Override);
    }
    return FPaths::ConvertRelativePathToFull(
        FString(FPlatformProcess::UserSettingsDir()) / TEXT("StupaPilgrimage/Toji"));
}

bool TojiSave::ParseWeb(const FString& Json, FTojiProgress& Result)
{
    TSharedPtr<FJsonObject> Root;
    const TSharedPtr<FJsonObject>* Sections = nullptr;
    if (!ReadObject(Json, Root) || !HasVersion(*Root, 2)
        || !Root->TryGetObjectField(TEXT("sections"), Sections) || !Sections->IsValid())
    {
        return false;
    }

    FTojiProgress Imported;
    const TSharedPtr<FJsonObject>* Settings = nullptr;
    if ((*Sections)->TryGetObjectField(TEXT("settings"), Settings) && Settings->IsValid())
    {
        FString Lang;
        if ((*Settings)->TryGetStringField(TEXT("lang"), Lang))
        {
            Imported.bEnglish = Lang != TEXT("zh") && Lang != TEXT("zh-Hant");
        }
    }

    const TSharedPtr<FJsonObject>* Campaign = nullptr;
    const TArray<TSharedPtr<FJsonValue>>* Steps = nullptr;
    if ((*Sections)->TryGetObjectField(TEXT("japanCampaign"), Campaign) && Campaign->IsValid()
        && HasVersion(**Campaign, 1) && (*Campaign)->TryGetArrayField(TEXT("completedSteps"), Steps))
    {
        int32 Consecutive = 0;
        for (const TSharedPtr<FJsonValue>& Step : *Steps)
        {
            FString Id;
            if (Consecutive >= UE_ARRAY_COUNT(OrderedSteps) || !Step->TryGetString(Id)
                || Id != OrderedSteps[Consecutive])
            {
                break;
            }
            ++Consecutive;
        }
        // The playable slice starts at Tō-ji. Qinglong is preserved in the source backup.
        Imported.Completed = FMath::Max(0, Consecutive - QinglongSteps);
    }
    Result = MoveTemp(Imported);
    return true;
}

bool TojiSave::Load(FTojiProgress& Result)
{
    const FString Path = Directory() / TEXT("progress.json");
    const int64 Size = IFileManager::Get().FileSize(*Path);
    FString Document;
    TSharedPtr<FJsonObject> Root;
    if (Size <= 0 || Size > MaxLocalBytes || !FFileHelper::LoadFileToString(Document, *Path)
        || !ReadObject(Document, Root) || !HasVersion(*Root, 1))
    {
        return false;
    }
    FTojiProgress Loaded;
    const TSharedPtr<FJsonValue> Completed = Root->TryGetField(TEXT("completed"));
    if (!Completed.IsValid() || Completed->Type != EJson::Number
        || !Root->TryGetBoolField(TEXT("english"), Loaded.bEnglish)
        || !Root->TryGetStringField(TEXT("webBackup"), Loaded.WebBackup) || !IsBackupName(Loaded.WebBackup))
    {
        return false;
    }
    const double Count = Completed->AsNumber();
    if (!FMath::IsFinite(Count) || Count < 0 || Count > ChapterSteps
        || Count != static_cast<int32>(Count))
    {
        return false;
    }
    Loaded.Completed = static_cast<int32>(Count);
    Result = MoveTemp(Loaded);
    return true;
}

bool TojiSave::Write(const FTojiProgress& Progress)
{
    const TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
    Root->SetNumberField(TEXT("version"), 1);
    Root->SetNumberField(TEXT("completed"), Progress.Completed);
    Root->SetBoolField(TEXT("english"), Progress.bEnglish);
    Root->SetStringField(TEXT("webBackup"), Progress.WebBackup);
    FString Document;
    if (!FJsonSerializer::Serialize(Root, TJsonWriterFactory<>::Create(&Document)))
    {
        return false;
    }
    return WriteAtomic(Directory() / TEXT("progress.json"), [&Document](const FString& Temporary)
    {
        return FFileHelper::SaveStringToFile(Document, *Temporary, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM);
    });
}

ETojiImportResult TojiSave::Import(const FString& Path, FTojiProgress& Result)
{
    // Read a bounded snapshot once. Validate and archive the same bytes.
    TUniquePtr<FArchive> File(IFileManager::Get().CreateFileReader(*Path, FILEREAD_Silent));
    if (!File || File->TotalSize() <= 0 || File->TotalSize() > MaxBackupBytes)
    {
        return ETojiImportResult::Invalid;
    }
    TArray<uint8> Bytes;
    Bytes.SetNumUninitialized(static_cast<int32>(File->TotalSize()));
    File->Serialize(Bytes.GetData(), Bytes.Num());
    if (File->IsError())
    {
        return ETojiImportResult::Invalid;
    }
    File.Reset();
    FString Document;
    FFileHelper::BufferToString(Document, Bytes.GetData(), Bytes.Num());
    FTojiProgress Imported;
    if (!ParseWeb(Document, Imported))
    {
        return ETojiImportResult::Invalid;
    }
    Imported.WebBackup = FGuid::NewGuid().ToString(EGuidFormats::Digits) + TEXT(".json");
    const FString Backup = Directory() / TEXT("WebBackups") / Imported.WebBackup;
    if (!WriteAtomic(Backup, [&Bytes](const FString& Temporary)
        { return FFileHelper::SaveArrayToFile(Bytes, *Temporary); }) || !Write(Imported))
    {
        return ETojiImportResult::StorageError;
    }
    Result = MoveTemp(Imported);
    return ETojiImportResult::Success;
}
