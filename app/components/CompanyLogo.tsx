import Image from 'next/image';

export default function CompanyLogo({ name }: { name: string }) {
  return (
    <Image
      src={`https://img.logo.dev/name/${name}?token=${process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY}`}
      alt={`${name} logo`}
      width={40}
      height={40}
      unoptimized
    />
  );
}